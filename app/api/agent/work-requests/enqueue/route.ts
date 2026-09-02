import { NextResponse } from "next/server";
import {
  getAgentIngestCompanyId,
  getMissingAgentBridgeEnvVars,
  isAgentBridgeConfigured,
  isAuthorizedAgentRequest,
} from "@/lib/agent-bridge/env";
import { enqueueWorkRequestsFromAgent } from "@/lib/database/queries/agent-work-requests";

/**
 * The Chief queueing work ON THE OPERATOR'S BEHALF.
 *
 * When an operator asks the Chief in Marketing Command to "research X" or
 * "make me a video about Y", the platform's `chief:respond` interprets the
 * message and POSTs the resulting TYPED requests here. They land in the same
 * migration-189 queue the buttons use, are pulled by the same `chief:work`
 * pass, and meet the same per-runner consent gates before anything runs —
 * one queue, one execution path, one rule.
 *
 * SAME AUTHORIZATION AS EVERY OTHER AGENT ROUTE: bearer `AGENT_INGEST_SECRET`
 * with the company bound server-side. Kind is a closed enum and params are
 * validated per kind before insert; an invalid item is refused whole, never
 * repaired. Request keys are deterministic per conversation question, so a
 * replayed answer run collapses on the unique index instead of queueing
 * twice.
 *
 * THIS ROUTE RUNS NOTHING AND PUBLISHES NOTHING. It records that the
 * operator, through the Chief, asked.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ROUTE_NAME = "agent-work-requests-enqueue";
const MAX_BATCH = 10;

/**
 * Bumped when the response shape changes.
 *
 * v1 answered `{queued, duplicates, invalid}` and the platform's parser only
 * read `queued` and `duplicates` — so refused items vanished between the two
 * repos and the operator was told every proposal had been queued. v2 names
 * `received`, `rejected` and `failed` explicitly and the platform reports
 * them; the version is echoed so a skew is visible rather than inferred.
 */
const ENQUEUE_CONTRACT_VERSION = 2;

type EnqueuePayload = {
  requests?: unknown;
};

export async function POST(request: Request) {
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

  const companyId = getAgentIngestCompanyId();
  if (!companyId) {
    return NextResponse.json(
      { ok: false, route: ROUTE_NAME, error: "No ingest company configured" },
      { status: 503 },
    );
  }

  let payload: EnqueuePayload;
  try {
    payload = (await request.json()) as EnqueuePayload;
  } catch {
    return NextResponse.json(
      { ok: false, route: ROUTE_NAME, error: "Body is not JSON" },
      { status: 400 },
    );
  }

  if (!Array.isArray(payload.requests) || payload.requests.length === 0) {
    return NextResponse.json(
      { ok: false, route: ROUTE_NAME, error: "requests must be a non-empty array" },
      { status: 400 },
    );
  }
  if (payload.requests.length > MAX_BATCH) {
    return NextResponse.json(
      { ok: false, route: ROUTE_NAME, error: `at most ${MAX_BATCH} requests per call` },
      { status: 400 },
    );
  }

  const items = payload.requests.map((entry) => {
    const raw =
      typeof entry === "object" && entry !== null
        ? (entry as Record<string, unknown>)
        : {};
    return {
      requestKey: typeof raw.requestKey === "string" ? raw.requestKey : "",
      kind: typeof raw.kind === "string" ? raw.kind : "",
      params: raw.params ?? null,
      note: typeof raw.note === "string" ? raw.note : null,
      requestedByEmail:
        typeof raw.requestedByEmail === "string" ? raw.requestedByEmail : null,
    };
  });

  const result = await enqueueWorkRequestsFromAgent({ companyId, requests: items });

  // ============ EVERY ITEM IS ACCOUNTED FOR BY NAME ============
  // `received` is the arithmetic anchor: queued + duplicates + rejected +
  // failed must equal it, so a caller can detect a dropped item rather than
  // inferring acceptance from the absence of an error. The platform reports
  // these counts to the operator verbatim — "queued 3" must mean three rows
  // exist, and anything refused must say so and why.
  return NextResponse.json({
    ok: true,
    route: ROUTE_NAME,
    contractVersion: ENQUEUE_CONTRACT_VERSION,
    received: result.received,
    queued: result.queued,
    duplicates: result.duplicates,
    rejected: result.rejected,
    failed: result.failed,
  });
}
