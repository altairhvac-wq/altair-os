import { NextResponse } from "next/server";
import {
  getAgentIngestCompanyId,
  getMissingAgentBridgeEnvVars,
  isAgentBridgeConfigured,
  isAuthorizedAgentRequest,
} from "@/lib/agent-bridge/env";
import {
  listUnappliedWorkRequests,
  markWorkRequestApplied,
} from "@/lib/database/queries/agent-work-requests";
import {
  isDelivered,
  settlementHttpStatus,
} from "@/shared/types/agent-settlement";

/**
 * The operator's work-request queue, as the Agent Platform sees it.
 *
 * The platform is behind NAT and cannot be called, so a request made in the
 * browser is queued (migration 189) and PULLED here, exactly as decisions and
 * questions are. GET returns requests the platform has not yet decided; POST
 * records what it did with one.
 *
 * SAME AUTHORIZATION AS EVERY OTHER AGENT ROUTE: bearer `AGENT_INGEST_SECRET`,
 * with the company bound server-side from configuration. A caller cannot read
 * or settle another company's requests even with a valid credential, because
 * the company is never taken from the request.
 *
 * THIS ROUTE RUNS NOTHING. It hands over a closed enum and records an outcome.
 * Whether the requested analysis actually runs is decided on the platform,
 * where each runner keeps its own consent gate — which this route cannot read,
 * set or bypass.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ROUTE_NAME = "agent-work-requests";
const MAX_LIMIT = 25;

function guard(request: Request): NextResponse | null {
  if (!isAgentBridgeConfigured()) {
    return NextResponse.json(
      {
        ok: false,
        route: ROUTE_NAME,
        error: `Agent bridge is not configured (missing: ${getMissingAgentBridgeEnvVars().join(", ")})`,
      },
      { status: 503 },
    );
  }
  if (!isAuthorizedAgentRequest(request)) {
    return NextResponse.json(
      { ok: false, route: ROUTE_NAME, error: "Unauthorized" },
      { status: 401 },
    );
  }
  return null;
}

export async function GET(request: Request) {
  const denied = guard(request);
  if (denied) return denied;

  const companyId = getAgentIngestCompanyId();
  if (!companyId) {
    return NextResponse.json(
      { ok: false, route: ROUTE_NAME, error: "No ingest company configured" },
      { status: 503 },
    );
  }

  const params = new URL(request.url).searchParams;
  const afterRaw = Number.parseInt(params.get("after") ?? "0", 10);
  const after = Number.isFinite(afterRaw) && afterRaw > 0 ? afterRaw : 0;
  const limitRaw = Number.parseInt(params.get("limit") ?? "10", 10);
  const limit = Number.isFinite(limitRaw)
    ? Math.min(Math.max(limitRaw, 1), MAX_LIMIT)
    : 10;

  // The company goes INTO the query, so the limit applies to this company's
  // rows rather than to a global page another tenant's backlog can fill.
  const all = await listUnappliedWorkRequests({
    companyId,
    afterSeq: after,
    limit,
  });
  if (all === null) {
    // A read failure is a 503, never an empty work list.
    return NextResponse.json(
      {
        ok: false,
        route: ROUTE_NAME,
        error: "The request queue could not be read.",
      },
      { status: 503 },
    );
  }
  // Belt and braces behind the SQL predicate: a last assertion that nothing
  // foreign reaches the wire, loud rather than silent if it ever does.
  const requests = all.filter((entry) => entry.companyId === companyId);
  if (requests.length !== all.length) {
    console.error("[agent-work-requests] query returned foreign rows:", {
      returned: all.length,
      kept: requests.length,
    });
  }

  return NextResponse.json({
    ok: true,
    route: ROUTE_NAME,
    companyId,
    cursor: after,
    requests: requests.map((entry) => ({
      seq: entry.seq,
      id: entry.id,
      kind: entry.kind,
      params: entry.params,
      note: entry.note,
      requestedByEmail: entry.requestedByEmail,
      requestedAt: entry.requestedAt,
    })),
  });
}

type OutcomePayload = {
  requestId?: unknown;
  outcome?: unknown;
  detail?: unknown;
};

export async function POST(request: Request) {
  const denied = guard(request);
  if (denied) return denied;

  const companyId = getAgentIngestCompanyId();
  if (!companyId) {
    return NextResponse.json(
      { ok: false, route: ROUTE_NAME, error: "No ingest company configured" },
      { status: 503 },
    );
  }

  let payload: OutcomePayload;
  try {
    payload = (await request.json()) as OutcomePayload;
  } catch {
    return NextResponse.json(
      { ok: false, route: ROUTE_NAME, error: "Body is not JSON" },
      { status: 400 },
    );
  }

  const requestId =
    typeof payload.requestId === "string" ? payload.requestId.trim() : "";
  if (!requestId) {
    return NextResponse.json(
      { ok: false, route: ROUTE_NAME, error: "requestId is required" },
      { status: 400 },
    );
  }

  // A closed set, checked here rather than trusted: the outcome column has a
  // CHECK constraint too, but a 400 explains the problem and a constraint
  // violation does not.
  const outcome = payload.outcome;
  if (
    outcome !== "completed" &&
    outcome !== "refused" &&
    outcome !== "failed"
  ) {
    return NextResponse.json(
      {
        ok: false,
        route: ROUTE_NAME,
        error: 'outcome must be "completed", "refused" or "failed"',
      },
      { status: 400 },
    );
  }

  const detail =
    typeof payload.detail === "string" && payload.detail.trim()
      ? payload.detail.trim()
      : null;

  const recorded = await markWorkRequestApplied({
    requestId,
    companyId,
    outcome,
    detail,
    nowIso: new Date().toISOString(),
  });

  if (recorded.error) {
    return NextResponse.json(
      { ok: false, route: ROUTE_NAME, error: recorded.error },
      { status: 400 },
    );
  }

  // What actually happened to the row, not merely "no database error". A
  // wrong or foreign id answers 404 so the platform can see the two sides
  // disagree, instead of being told its outcome landed.
  const settlement = recorded.outcome ?? "not_found";
  return NextResponse.json(
    {
      ok: isDelivered(settlement),
      route: ROUTE_NAME,
      requestId,
      settlement,
      error:
        settlement === "not_found"
          ? "No such work request for this company."
          : null,
    },
    { status: settlementHttpStatus(settlement) },
  );
}
