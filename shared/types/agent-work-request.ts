/**
 * The closed vocabulary of work an operator may request from the Chief.
 *
 * ============ WHY THIS LIST IS SHORT, AND WHY IT IS A LIST ============
 * Every entry is a PARAMETERLESS, NON-PUBLISHING analysis run that already
 * exists on the Agent Platform as its own gated entry point. There is no
 * free-text command, no argument and no shell anywhere in this path, so the
 * request queue cannot become arbitrary execution — which is the whole point.
 * Adding a kind takes a migration and a code change on both sides.
 *
 * Kinds that were deliberately NOT included: research investigations, Director
 * planning and content-task creation all need parameters (which metric, which
 * topic, which package) that an operator has not supplied and that this layer
 * must not invent. Offering a button that queues a half-formed task would be
 * worse than not offering it.
 *
 * ============ REQUESTING IS NOT RUNNING ============
 * A request records that a human asked. The platform decides whether anything
 * happens, and each runner keeps its own consent gate — so a request whose
 * gate is off comes back `refused`, having spent nothing.
 */

export const WORK_REQUEST_KINDS = [
  "performance_review",
  "finance_report",
] as const;

export type WorkRequestKind = (typeof WORK_REQUEST_KINDS)[number];

export type WorkRequestDescriptor = {
  readonly kind: WorkRequestKind;
  /** What the operator is asking for, in their language. */
  readonly label: string;
  /** What it actually does, and what it costs them. */
  readonly detail: string;
  /**
   * The platform consent gate that must be enabled for it to run.
   *
   * Named here only so the surface can explain a refusal honestly. Altair OS
   * cannot read or set it: it lives in the platform's own environment, which
   * is exactly why it is a real second consent rather than a label.
   */
  readonly platformGate: string;
};

export const WORK_REQUEST_DESCRIPTORS: Readonly<
  Record<WorkRequestKind, WorkRequestDescriptor>
> = {
  performance_review: {
    kind: "performance_review",
    label: "Review content performance",
    detail:
      "Reads how published posts actually performed and matches them to the experiments that produced them. Read-only — it publishes nothing.",
    platformGate: "RUN_CONTENT_PERFORMANCE",
  },
  finance_report: {
    kind: "finance_report",
    label: "Review model spend",
    detail:
      "Totals what the agents have spent against the configured budgets. Read-only — it changes no budget and moves no money.",
    platformGate: "RUN_FINANCE_REPORT",
  },
};

/**
 * `failed` is deliberately distinct from `refused`: a run that broke and a
 * run that was never allowed to start are different facts about the system,
 * and collapsing them would hide one of them from the operator.
 */
export type WorkRequestOutcome = "completed" | "refused" | "failed";

export type WorkRequest = {
  readonly id: string;
  readonly kind: WorkRequestKind;
  readonly note: string | null;
  readonly requestedByEmail: string | null;
  readonly requestedAt: string;
  readonly appliedAt: string | null;
  readonly outcome: WorkRequestOutcome | null;
  readonly outcomeDetail: string | null;
};

export const WORK_REQUEST_NOTE_MAX = 500;

export function isWorkRequestKind(value: unknown): value is WorkRequestKind {
  return (
    typeof value === "string" &&
    (WORK_REQUEST_KINDS as readonly string[]).includes(value)
  );
}

/**
 * What the operator is told about one request, without ever implying it ran.
 *
 * The waiting copy names the real mechanism — the platform pulls on its next
 * cycle — because an operator who believes this is instant will read silence
 * as failure.
 */
export function describeWorkRequest(request: WorkRequest): string {
  const label = WORK_REQUEST_DESCRIPTORS[request.kind].label;

  if (request.outcome === "completed") {
    return `${label} — done.`;
  }
  if (request.outcome === "refused") {
    return `${label} — not run. ${
      request.outcomeDetail ?? "The platform declined the request."
    }`;
  }
  if (request.outcome === "failed") {
    return `${label} — failed. ${
      request.outcomeDetail ?? "The run did not complete."
    }`;
  }
  return `${label} — queued. It runs the next time the Agent Platform is run.`;
}
