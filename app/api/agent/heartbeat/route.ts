import { NextResponse } from "next/server";
import {
  getAgentIngestCompanyId,
  getMissingAgentBridgeEnvVars,
  isAgentBridgeConfigured,
  isAuthorizedAgentRequest,
} from "@/lib/agent-bridge/env";
import { recordAgentPlatformHeartbeat } from "@/lib/database/queries/agent-platform-heartbeat";
import type { AgentHeartbeatQueueStatus } from "@/shared/types/agent-heartbeat";

/**
 * The Agent Platform's liveness signal.
 *
 * ============ POST ONLY — THIS IS NOT A QUEUE ============
 * Every other agent-bridge route exists because the platform is behind NAT
 * and has to PULL work Altair OS queued for it. A heartbeat is the opposite
 * shape: the platform is the one with something to report ("I am alive, on
 * this queue configuration, as of this moment"), so it simply POSTS, and
 * there is nothing here for Altair OS to hand back — no GET, no cursor, no
 * settlement. Read access is the Marketing Command page reading the row
 * `recordAgentPlatformHeartbeat` last wrote.
 *
 * SAME AUTHORIZATION AS EVERY OTHER AGENT ROUTE: bearer `AGENT_INGEST_SECRET`,
 * company bound server-side from configuration — never from the payload.
 *
 * THIS ROUTE RUNS NOTHING AND PUBLISHES NOTHING. It records a timestamp and a
 * small, bounded status summary. Zero model spend is possible here by
 * construction: there is no model call in this path at all.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ROUTE_NAME = "agent-heartbeat";
const MAX_QUEUES = 12;
const MAX_NAME_LEN = 60;
const MAX_REASON_LEN = 500;

type HeartbeatPayload = {
  reportedAt?: unknown;
  queues?: unknown;
};

function parseQueues(raw: unknown): AgentHeartbeatQueueStatus[] | null {
  if (raw === undefined) return [];
  if (!Array.isArray(raw) || raw.length > MAX_QUEUES) return null;

  const queues: AgentHeartbeatQueueStatus[] = [];
  for (const entry of raw) {
    if (typeof entry !== "object" || entry === null) return null;
    const candidate = entry as Record<string, unknown>;
    if (typeof candidate.name !== "string" || !candidate.name.trim()) return null;
    if (typeof candidate.enabled !== "boolean") return null;
    if (
      candidate.disabledReason !== null &&
      candidate.disabledReason !== undefined &&
      typeof candidate.disabledReason !== "string"
    ) {
      return null;
    }
    if (
      candidate.consecutiveFailures !== undefined &&
      (typeof candidate.consecutiveFailures !== "number" ||
        !Number.isFinite(candidate.consecutiveFailures) ||
        candidate.consecutiveFailures < 0)
    ) {
      return null;
    }
    queues.push({
      name: candidate.name.trim().slice(0, MAX_NAME_LEN),
      enabled: candidate.enabled,
      disabledReason:
        typeof candidate.disabledReason === "string"
          ? candidate.disabledReason.slice(0, MAX_REASON_LEN)
          : null,
      consecutiveFailures:
        typeof candidate.consecutiveFailures === "number"
          ? Math.floor(candidate.consecutiveFailures)
          : 0,
    });
  }
  return queues;
}

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

  let payload: HeartbeatPayload;
  try {
    payload = (await request.json()) as HeartbeatPayload;
  } catch {
    return NextResponse.json(
      { ok: false, route: ROUTE_NAME, error: "Body is not JSON" },
      { status: 400 },
    );
  }

  const reportedAt =
    typeof payload.reportedAt === "string" ? payload.reportedAt.trim() : "";
  if (!reportedAt || Number.isNaN(Date.parse(reportedAt))) {
    return NextResponse.json(
      { ok: false, route: ROUTE_NAME, error: "reportedAt must be a valid ISO timestamp" },
      { status: 400 },
    );
  }

  const queues = parseQueues(payload.queues);
  if (queues === null) {
    return NextResponse.json(
      {
        ok: false,
        route: ROUTE_NAME,
        error: `queues must be an array of at most ${String(MAX_QUEUES)} {name, enabled, disabledReason?, consecutiveFailures?} entries`,
      },
      { status: 400 },
    );
  }

  const recorded = await recordAgentPlatformHeartbeat({
    companyId,
    reportedAt,
    queues,
  });

  if (recorded.error) {
    return NextResponse.json(
      { ok: false, route: ROUTE_NAME, error: recorded.error },
      { status: 400 },
    );
  }

  return NextResponse.json({ ok: true, route: ROUTE_NAME });
}
