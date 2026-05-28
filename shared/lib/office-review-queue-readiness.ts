import type { CompletedWorkReviewReason } from "@/shared/types/reports";

/** Discrete operational readiness bands — heuristic only, not accounting validation. */
export type OfficeReviewQueueReadinessScore = 100 | 75 | 50 | 25 | 0;

export type OfficeReviewQueueReadinessColor =
  | "emerald"
  | "sky"
  | "amber"
  | "orange"
  | "rose";

export type OfficeReviewQueueReadinessInput = {
  kind:
    | "completed_work_review"
    | "operational_inconsistency"
    | "awaiting_invoicing"
    | "stalled_job";
  reviewReasons: CompletedWorkReviewReason[];
  agingBucket: "fresh" | "aging" | "overdue";
  blockerCount: number;
  daysAging: number;
};

export type OfficeReviewQueueReadiness = {
  readinessScore: OfficeReviewQueueReadinessScore;
  readinessLabel: string;
  readinessColor: OfficeReviewQueueReadinessColor;
  /** Short, human-readable rationale for tooltips and help text. */
  readinessExplanation: string;
};

const READINESS_LABELS: Record<OfficeReviewQueueReadinessScore, string> = {
  100: "Ready",
  75: "Minor cleanup",
  50: "Moderate blockers",
  25: "Major blockers",
  0: "Critical gaps",
};

const READINESS_COLORS: Record<
  OfficeReviewQueueReadinessScore,
  OfficeReviewQueueReadinessColor
> = {
  100: "emerald",
  75: "sky",
  50: "amber",
  25: "orange",
  0: "rose",
};

export const OFFICE_REVIEW_QUEUE_READINESS_LIMITATIONS = [
  "Workflow readiness scores are heuristic operational signals only — not accounting validation.",
  "Readiness does not verify payroll accuracy, invoice correctness, or GL posting.",
  "Readiness is not SLA scoring — aging buckets inform the score but do not enforce due dates.",
] as const;

export const OFFICE_REVIEW_QUEUE_READINESS_LEGEND: {
  score: OfficeReviewQueueReadinessScore;
  label: string;
  description: string;
}[] = [
  {
    score: 100,
    label: "Ready",
    description: "At most minor profitability cleanup — closest to operational complete.",
  },
  {
    score: 75,
    label: "Minor cleanup",
    description: "Single invoicing gap or fresh stalled pipeline context.",
  },
  {
    score: 50,
    label: "Moderate blockers",
    description: "One or two operational flags, or aging without a critical combo.",
  },
  {
    score: 25,
    label: "Major blockers",
    description: "Multiple billing blockers or overdue items needing urgent follow-up.",
  },
  {
    score: 0,
    label: "Critical gaps",
    description: "All primary billing blockers present, or critically overdue pipeline stall.",
  },
];

function clampReadinessScore(
  score: number,
): OfficeReviewQueueReadinessScore {
  if (score <= 0) {
    return 0;
  }
  if (score <= 25) {
    return 25;
  }
  if (score <= 50) {
    return 50;
  }
  if (score <= 75) {
    return 75;
  }

  return 100;
}

/** Downgrades readiness by one band when aging intelligence suggests neglect. */
function applyAgingAdjustment(
  baseScore: OfficeReviewQueueReadinessScore,
  agingBucket: OfficeReviewQueueReadinessInput["agingBucket"],
): OfficeReviewQueueReadinessScore {
  if (agingBucket === "fresh") {
    return baseScore;
  }

  if (agingBucket === "overdue") {
    return clampReadinessScore(Math.min(baseScore, 25));
  }

  // aging bucket (3–6 days)
  return clampReadinessScore(Math.min(baseScore, 50));
}

function formatAgingNote(
  agingBucket: OfficeReviewQueueReadinessInput["agingBucket"],
): string {
  switch (agingBucket) {
    case "fresh":
      return "";
    case "aging":
      return " Aging follow-up window.";
    case "overdue":
      return " Overdue operational age.";
  }
}

function buildReadinessResult(
  score: OfficeReviewQueueReadinessScore,
  explanation: string,
): OfficeReviewQueueReadiness {
  return {
    readinessScore: score,
    readinessLabel: READINESS_LABELS[score],
    readinessColor: READINESS_COLORS[score],
    readinessExplanation: explanation,
  };
}

function scoreCompletedWorkReview(input: {
  reviewReasons: CompletedWorkReviewReason[];
  agingBucket: OfficeReviewQueueReadinessInput["agingBucket"];
  blockerCount: number;
}): OfficeReviewQueueReadiness {
  const { reviewReasons, agingBucket, blockerCount } = input;
  const hasPending = reviewReasons.includes("pending_expenses");
  const hasLabor = reviewReasons.includes("open_labor_entries");
  const hasNoInvoice = reviewReasons.includes("no_active_invoice");
  const hasProfitGap = reviewReasons.includes("profitability_data_incomplete");

  let baseScore: OfficeReviewQueueReadinessScore;
  let explanation: string;

  if (hasPending && hasLabor && hasNoInvoice) {
    baseScore = 0;
    explanation =
      "Pending expenses, open labor, and missing invoice — all primary billing blockers.";
  } else if (
    (hasPending && hasLabor) ||
    (hasPending && hasNoInvoice) ||
    blockerCount >= 3
  ) {
    baseScore = 25;
    explanation =
      "Multiple billing blockers remain before operational closure.";
  } else if (hasLabor && hasNoInvoice) {
    baseScore = 50;
    explanation = "Open labor and missing invoice — settle time before invoicing.";
  } else if (hasPending) {
    baseScore = 25;
    explanation = "Pending expenses must clear before billing readiness.";
  } else if (hasLabor) {
    baseScore = 50;
    explanation = "Open labor entries still need review or closure.";
  } else if (hasNoInvoice) {
    baseScore = 75;
    explanation = "Operational blockers cleared — invoice creation is the main gap.";
  } else if (hasProfitGap) {
    baseScore = 100;
    explanation =
      "Only profitability data gaps flagged — minor cleanup before admin review.";
  } else {
    baseScore = 100;
    explanation = "No operational blockers detected in queue metadata.";
  }

  const score = applyAgingAdjustment(baseScore, agingBucket);
  explanation += formatAgingNote(agingBucket);

  return buildReadinessResult(score, explanation.trim());
}

function scoreAwaitingInvoicing(
  agingBucket: OfficeReviewQueueReadinessInput["agingBucket"],
): OfficeReviewQueueReadiness {
  let baseScore: OfficeReviewQueueReadinessScore = 75;
  let explanation =
    "Completed work with no active invoice — invoicing is the primary remaining step.";

  if (agingBucket === "aging") {
    baseScore = 50;
  } else if (agingBucket === "overdue") {
    baseScore = 25;
  }

  const score = applyAgingAdjustment(baseScore, agingBucket);
  explanation += formatAgingNote(agingBucket);

  return buildReadinessResult(score, explanation.trim());
}

function scoreOperationalInconsistency(
  blockerCount: number,
): OfficeReviewQueueReadiness {
  let baseScore: OfficeReviewQueueReadinessScore;
  let explanation: string;

  if (blockerCount >= 3) {
    baseScore = 25;
    explanation =
      "Multiple data integrity issues — dispatch, labor, billing, or workflow fields need manual reconciliation.";
  } else if (blockerCount >= 2) {
    baseScore = 50;
    explanation =
      "Several data integrity flags — follow recovery guidance on the job or dispatch board.";
  } else {
    baseScore = 75;
    explanation =
      "Single data integrity flag — reconcile dispatch, labor, or billing records before close-out.";
  }

  return buildReadinessResult(baseScore, explanation.trim());
}

function scoreStalledJob(
  agingBucket: OfficeReviewQueueReadinessInput["agingBucket"],
  daysAging: number,
): OfficeReviewQueueReadiness {
  let baseScore: OfficeReviewQueueReadinessScore;
  let explanation: string;

  if (agingBucket === "overdue") {
    baseScore = 0;
    explanation = `Stalled pipeline job — ${daysAging}+ days without activity.`;
  } else if (agingBucket === "aging") {
    baseScore = 25;
    explanation = "Stalled pipeline job entering the aging follow-up window.";
  } else {
    baseScore = 50;
    explanation =
      "Stalled pipeline context — job has not progressed recently.";
  }

  const score = applyAgingAdjustment(baseScore, agingBucket);
  explanation += formatAgingNote(agingBucket);

  return buildReadinessResult(score, explanation.trim());
}

/**
 * Deterministic, read-only operational readiness from existing queue metadata.
 * Does not inspect profitability math, assignments, permissions, or live form state.
 */
export function resolveOfficeReviewQueueReadiness(
  item: OfficeReviewQueueReadinessInput,
): OfficeReviewQueueReadiness {
  switch (item.kind) {
    case "completed_work_review":
      return scoreCompletedWorkReview({
        reviewReasons: item.reviewReasons,
        agingBucket: item.agingBucket,
        blockerCount: item.blockerCount,
      });
    case "operational_inconsistency":
      return scoreOperationalInconsistency(item.blockerCount);
    case "awaiting_invoicing":
      return scoreAwaitingInvoicing(item.agingBucket);
    case "stalled_job":
      return scoreStalledJob(item.agingBucket, item.daysAging);
  }
}

// TODO(office-review-queue-readiness-v2): AI-assisted readiness scoring with human review.
// TODO(office-review-queue-readiness-v2): Staffing-aware readiness weighting by office capacity.
// TODO(office-review-queue-readiness-v2): Predictive workflow risk from resolution trend signals.
// TODO(office-review-queue-readiness-v2): Composite operational health scoring across queues.
