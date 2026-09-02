import "server-only";

import { createServiceRoleClient } from "@/lib/supabase/service";
import type {
  AgentHeartbeatQueueStatus,
  AgentPlatformHeartbeat,
} from "@/shared/types/agent-heartbeat";

/**
 * The Agent Platform's own liveness signal (migration 193).
 *
 * ============ ONE ROW, ALWAYS UPSERTED ============
 * Not a queue: there is no cursor, no backlog, no settlement. The platform
 * posts its current state on a short interval and this holds only the LATEST
 * one per company — an upsert on `company_id`, never an insert-and-accumulate.
 */

const MAX_QUEUE_NAME_LEN = 60;
const MAX_DISABLED_REASON_LEN = 500;
const MAX_QUEUES = 12;

type HeartbeatRow = {
  company_id: string;
  reported_at: string;
  queues: unknown;
};

type AnyClient = ReturnType<typeof createServiceRoleClient>;

function heartbeatsTable(client: AnyClient) {
  // agent_platform_heartbeats: migration 193 — wire into Database types on next gen types run
  return (
    client as AnyClient & {
      from(table: "agent_platform_heartbeats"): ReturnType<AnyClient["from"]>;
    }
  ).from("agent_platform_heartbeats");
}

/**
 * Bounded, defensive parse of the stored `queues` JSON. A row that fails to
 * parse as the expected shape is treated as "no queue detail" rather than
 * thrown — the reported_at timestamp alone still answers ONLINE/OFFLINE.
 */
function toQueues(raw: unknown): AgentHeartbeatQueueStatus[] {
  if (!Array.isArray(raw)) return [];
  const out: AgentHeartbeatQueueStatus[] = [];
  for (const entry of raw.slice(0, MAX_QUEUES)) {
    if (typeof entry !== "object" || entry === null) continue;
    const candidate = entry as Record<string, unknown>;
    const name = typeof candidate.name === "string" ? candidate.name.slice(0, MAX_QUEUE_NAME_LEN) : null;
    if (!name) continue;
    out.push({
      name,
      enabled: candidate.enabled === true,
      disabledReason:
        typeof candidate.disabledReason === "string"
          ? candidate.disabledReason.slice(0, MAX_DISABLED_REASON_LEN)
          : null,
      consecutiveFailures:
        typeof candidate.consecutiveFailures === "number" &&
        Number.isFinite(candidate.consecutiveFailures) &&
        candidate.consecutiveFailures >= 0
          ? Math.floor(candidate.consecutiveFailures)
          : 0,
    });
  }
  return out;
}

/** The founder's read: the latest heartbeat, or null if none has ever landed. */
export async function getLatestAgentPlatformHeartbeat(
  companyId: string,
): Promise<AgentPlatformHeartbeat | null> {
  const supabase = createServiceRoleClient();
  const { data, error } = await heartbeatsTable(supabase)
    .select("company_id, reported_at, queues")
    .eq("company_id", companyId)
    .maybeSingle();

  if (error) {
    console.error("[getLatestAgentPlatformHeartbeat] read failed:", {
      companyId,
      code: error.code,
    });
    // Unlike the pull queues, a read failure here is not a correctness risk —
    // nothing is delivered or settled from this table. It is reported as "no
    // heartbeat", which renders OFFLINE: the honest direction to fail toward
    // for a liveness signal is "assume the worst", not "assume healthy".
    return null;
  }
  if (!data) return null;

  const row = data as HeartbeatRow;
  return {
    reportedAt: row.reported_at,
    queues: toQueues(row.queues),
  };
}

/**
 * The platform's side: record its current state.
 *
 * Company-scoped by the CALLER (the route binds it server-side from the
 * ingest secret, never from the payload — the same rule as every other
 * bridge write). Upserted on `company_id`, so this call is naturally
 * idempotent-by-overwrite: posting the same or a newer state is always safe,
 * and there is nothing here for a duplicate POST to corrupt.
 */
export async function recordAgentPlatformHeartbeat(input: {
  companyId: string;
  reportedAt: string;
  queues: readonly AgentHeartbeatQueueStatus[];
}): Promise<{ error?: string }> {
  const supabase = createServiceRoleClient();
  const { error } = await heartbeatsTable(supabase)
    .upsert(
      {
        company_id: input.companyId,
        reported_at: input.reportedAt,
        queues: input.queues.slice(0, MAX_QUEUES).map((queue) => ({
          name: queue.name.slice(0, MAX_QUEUE_NAME_LEN),
          enabled: queue.enabled,
          disabledReason: queue.disabledReason?.slice(0, MAX_DISABLED_REASON_LEN) ?? null,
          consecutiveFailures: Math.max(0, Math.floor(queue.consecutiveFailures)),
        })),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "company_id" },
    );

  if (error) {
    console.error("[recordAgentPlatformHeartbeat] upsert failed:", {
      companyId: input.companyId,
      code: error.code,
    });
    return { error: "The heartbeat could not be recorded." };
  }
  return {};
}
