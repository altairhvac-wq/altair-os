import { NextResponse } from "next/server";
import {
  getAgentIngestCompanyId,
  getAgentPlatformCompanyId,
  getMissingAgentBridgeEnvVars,
  isAgentBridgeConfigured,
  isAuthorizedAgentRequest,
} from "@/lib/agent-bridge/env";
import {
  listAgentDecisionsSince,
  markAgentDecisionsApplied,
} from "@/lib/database/queries/agent-decisions";
import {
  createRequestId,
  requestIdFromHeaders,
  runOperation,
} from "@/lib/operations";

/**
 * The decision pull surface.
 *
 * The Agent Platform is behind NAT and cannot be called, so it asks for
 * decisions rather than being told about them. GET returns everything after a
 * cursor; POST acknowledges what it durably applied.
 *
 * SAME AUTHORIZATION AS INGEST: bearer `AGENT_INGEST_SECRET`, company bound
 * server-side from configuration. A caller cannot read another company's
 * decisions even with a valid credential.
 *
 * CURSOR, NOT DELETION. Decisions are never removed; the platform tracks the
 * highest seq it has applied and asks for everything after it. Re-pulling is
 * therefore a no-op and a lost response costs nothing.
 *
 * ACKNOWLEDGEMENT IS ADVISORY. `applied_at` exists so the UI can say "queued"
 * versus "applied" honestly. It is not a delivery guarantee and nothing gates
 * on it — the cursor is what actually prevents reprocessing.
 *
 * THIS ROUTE PUBLISHES NOTHING. It hands over recorded human decisions. What,
 * if anything, happens externally is decided by the platform's own permission
 * and effect machinery.
 */

export const runtime = "nodejs";

const ROUTE_NAME = "agent-decisions";
const MAX_LIMIT = 200;

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
      { ok: false, route: ROUTE_NAME, error: "Agent bridge is not configured" },
      { status: 503 },
    );
  }

  const url = new URL(request.url);
  const rawSince = Number.parseInt(url.searchParams.get("since") ?? "0", 10);
  const since = Number.isFinite(rawSince) && rawSince > 0 ? rawSince : 0;
  const rawLimit = Number.parseInt(url.searchParams.get("limit") ?? "100", 10);
  const limit = Number.isFinite(rawLimit)
    ? Math.min(Math.max(rawLimit, 1), MAX_LIMIT)
    : 100;

  const requestId = requestIdFromHeaders(request.headers) ?? createRequestId();
  const opResult = await runOperation({
    operationName: "agent.decisions.pull",
    context: { requestId, route: "/api/agent/decisions" },
    throwOnFailure: false,
    callback: async () => {
      const decisions = await listAgentDecisionsSince(companyId, since, limit);
      if (decisions === null) {
        // A read failure is a 503, never an empty decision list. Answering
        // 200 with `[]` made a broken table indistinguishable from a quiet
        // queue: the platform's cycle reported "both halves settled" and the
        // gateway stayed on its normal interval while every human approval
        // sat undelivered. The two sibling queues already answer this way.
        return NextResponse.json(
          {
            ok: false,
            route: ROUTE_NAME,
            error: "The decision queue could not be read.",
          },
          { status: 503 },
        );
      }
      return NextResponse.json({
        ok: true,
        route: ROUTE_NAME,
        contractVersion: 1,
        platformCompanyId: getAgentPlatformCompanyId(),
        since,
        decisions,
        // The cursor the platform should send next time. Equal to `since`
        // when nothing new arrived, which makes an empty poll unambiguous.
        nextSince: decisions.reduce(
          (max, entry) => Math.max(max, entry.seq),
          since,
        ),
      });
    },
  });

  if (!opResult.success || !opResult.value) {
    return NextResponse.json(
      { ok: false, route: ROUTE_NAME, error: "Decision pull failed" },
      { status: 500 },
    );
  }
  return opResult.value;
}

export async function POST(request: Request) {
  const denied = guard(request);
  if (denied) return denied;

  const companyId = getAgentIngestCompanyId();
  if (!companyId) {
    return NextResponse.json(
      { ok: false, route: ROUTE_NAME, error: "Agent bridge is not configured" },
      { status: 503 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, route: ROUTE_NAME, error: "Body is not valid JSON" },
      { status: 400 },
    );
  }

  const applied =
    typeof body === "object" && body !== null && "appliedSeqs" in body
      ? (body as { appliedSeqs: unknown }).appliedSeqs
      : null;
  if (!Array.isArray(applied)) {
    return NextResponse.json(
      { ok: false, route: ROUTE_NAME, error: "appliedSeqs must be an array" },
      { status: 400 },
    );
  }

  const seqs = applied
    .filter(
      (entry): entry is number =>
        typeof entry === "number" && Number.isFinite(entry),
    )
    .slice(0, MAX_LIMIT);

  const count = await markAgentDecisionsApplied(companyId, seqs);
  return NextResponse.json({
    ok: true,
    route: ROUTE_NAME,
    acknowledged: count,
  });
}
