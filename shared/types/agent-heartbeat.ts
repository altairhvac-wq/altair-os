/**
 * The Agent Platform's liveness signal — ONLINE / DEGRADED / OFFLINE — and the
 * pure arithmetic that turns a timestamp and a queue list into one of them.
 *
 * ============ WHY THIS IS A SEPARATE SIGNAL FROM THE MARKETING SNAPSHOT ============
 * `isSnapshotFresh` (marketing-command.ts) answers "is the business data
 * current", with a 24-hour window sized for that question. This answers "is
 * the platform process actually alive right now", with a window sized in
 * MINUTES — because a queued Chief question must never sit for hours with
 * only "waiting for next cycle" and no indication the platform is offline.
 *
 * ============ THE THRESHOLDS, STATED SO A TEST CAN HOLD THEM ============
 * The platform's default heartbeat interval is 30s (ALTAIR_CHIEF_HEARTBEAT_
 * INTERVAL_SECONDS, clamped 15-300s on that side). ONLINE tolerates a few
 * missed beats before treating a normal jitter as a problem; DEGRADED is the
 * "something is wrong, but recently alive" zone; past that, OFFLINE — no
 * retry will fix what needs an operator to notice.
 */

export const HEARTBEAT_ONLINE_MAX_AGE_MS = 3 * 60_000; // 3 minutes
export const HEARTBEAT_OFFLINE_MIN_AGE_MS = 15 * 60_000; // 15 minutes

export const AGENT_PLATFORM_STATUSES = ["online", "degraded", "offline"] as const;
export type AgentPlatformStatus = (typeof AGENT_PLATFORM_STATUSES)[number];

export type AgentHeartbeatQueueStatus = {
  readonly name: string;
  readonly enabled: boolean;
  readonly disabledReason: string | null;
  readonly consecutiveFailures: number;
};

export type AgentPlatformHeartbeat = {
  readonly reportedAt: string;
  readonly queues: readonly AgentHeartbeatQueueStatus[];
};

export type AgentPlatformStatusReport = {
  readonly status: AgentPlatformStatus;
  /** Null only when the platform has never reported at all. */
  readonly lastSeenAt: string | null;
  /** Milliseconds since the last heartbeat, or null if never seen. */
  readonly ageMs: number | null;
  /** The queues actually causing a DEGRADED verdict, if any. */
  readonly troubledQueues: readonly AgentHeartbeatQueueStatus[];
};

/**
 * Derive the status from a heartbeat row (or its absence) and the current
 * time. Pure and deterministic — no AI, no network, no side effect.
 *
 * ============ A FRESH HEARTBEAT CAN STILL BE DEGRADED ============
 * The gateway process can be perfectly alive and still report a queue it
 * disabled (a missing RUN_* gate, a bad URL) — staleness is not the only way
 * to be unhealthy. A heartbeat within the ONLINE window but naming a
 * disabled/failing queue is DEGRADED, not ONLINE: the operator asked "is the
 * platform working", not merely "is the process running".
 */
export function deriveAgentPlatformStatus(
  heartbeat: AgentPlatformHeartbeat | null,
  nowIso: string,
): AgentPlatformStatusReport {
  if (heartbeat === null) {
    return { status: "offline", lastSeenAt: null, ageMs: null, troubledQueues: [] };
  }

  const reportedAtMs = Date.parse(heartbeat.reportedAt);
  const nowMs = Date.parse(nowIso);
  // A heartbeat that fails to parse is exactly as informative as none at all
  // — never let a corrupt timestamp read as "just now".
  if (!Number.isFinite(reportedAtMs) || !Number.isFinite(nowMs)) {
    return { status: "offline", lastSeenAt: null, ageMs: null, troubledQueues: [] };
  }

  // Clock skew (the platform's clock running slightly ahead) must never
  // produce a negative age that looks MORE fresh than "just now".
  const ageMs = Math.max(0, nowMs - reportedAtMs);

  const troubledQueues = heartbeat.queues.filter(
    (queue) => !queue.enabled || queue.disabledReason !== null || queue.consecutiveFailures > 0,
  );

  if (ageMs >= HEARTBEAT_OFFLINE_MIN_AGE_MS) {
    return { status: "offline", lastSeenAt: heartbeat.reportedAt, ageMs, troubledQueues };
  }
  if (ageMs >= HEARTBEAT_ONLINE_MAX_AGE_MS || troubledQueues.length > 0) {
    return { status: "degraded", lastSeenAt: heartbeat.reportedAt, ageMs, troubledQueues };
  }
  return { status: "online", lastSeenAt: heartbeat.reportedAt, ageMs, troubledQueues: [] };
}

/** "3s" / "4m" / "2h" / "5d" — the coarsest unit that fits, never zero. */
export function formatRelativeAge(ageMs: number): string {
  const seconds = Math.max(1, Math.round(ageMs / 1000));
  if (seconds < 60) return `${String(seconds)}s`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${String(minutes)}m`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${String(hours)}h`;
  const days = Math.round(hours / 24);
  return `${String(days)}d`;
}

/** One line of operator-facing prose per status, never implying more than is known. */
export function describeAgentPlatformStatus(report: AgentPlatformStatusReport): string {
  if (report.status === "offline") {
    return report.lastSeenAt === null
      ? "The Agent Platform has never reported in."
      : `The Agent Platform has not reported in over ${formatRelativeAge(report.ageMs ?? 0)} and is considered offline.`;
  }
  if (report.status === "degraded") {
    const trouble = report.troubledQueues[0];
    if (trouble) {
      return `Degraded — ${trouble.name}: ${trouble.disabledReason ?? "not enabled"}.`;
    }
    return `Degraded — last seen ${formatRelativeAge(report.ageMs ?? 0)} ago.`;
  }
  return `Online — last seen ${formatRelativeAge(report.ageMs ?? 0)} ago.`;
}
