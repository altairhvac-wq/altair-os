import {
  isValidOfficeReviewQueueCustomerId,
  isValidOfficeReviewQueueJobId,
  type OfficeReviewQueueItem,
} from "@/shared/types/office-review-queue";

export type OfficeReviewQueueBulkActionId =
  | "create_invoices"
  | "review_expenses"
  | "review_labor"
  | "open_jobs";

export type OfficeReviewQueueBatchBlockReason =
  | "missing_customer_id"
  | "invoice_already_exists"
  | "job_not_completed"
  | "no_open_labor_entries"
  | "no_pending_expenses";

export type OfficeReviewQueueBatchJobEligibility = {
  jobId: string;
  jobNumber: string;
  eligible: boolean;
  blockedReasons: OfficeReviewQueueBatchBlockReason[];
};

export type OfficeReviewQueueBatchBlockedReasonSummary = {
  reason: OfficeReviewQueueBatchBlockReason;
  label: string;
  count: number;
  jobIds: string[];
};

export type OfficeReviewQueueBatchPreview = {
  actionId: OfficeReviewQueueBulkActionId;
  label: string;
  totalSelected: number;
  eligibleCount: number;
  blockedCount: number;
  eligibleJobIds: string[];
  blockedJobIds: string[];
  blockedReasons: OfficeReviewQueueBatchBlockedReasonSummary[];
  jobs: OfficeReviewQueueBatchJobEligibility[];
  recommendedNextStep: string;
  /** Always true in V1 — informational preview only. */
  previewOnly: true;
};

export type OfficeReviewQueueBatchPreviewSummary = {
  actionId: OfficeReviewQueueBulkActionId;
  label: string;
  headline: string;
  detail: string;
  recommendedNextStep: string;
};

export const OFFICE_REVIEW_QUEUE_BATCH_PREVIEW_LIMITATIONS = [
  "Batch previews are informational only — no bulk execution or backend writes.",
  "Eligibility uses queue report metadata and review flags — not live permissions or form state.",
  "No permission-aware batching, partial execution flows, or approval routing yet.",
] as const;

export const BATCH_ACTION_LABELS: Record<OfficeReviewQueueBulkActionId, string> =
  {
    create_invoices: "Create invoices",
    review_expenses: "Review expenses",
    review_labor: "Review labor",
    open_jobs: "Open jobs",
  };

export const BATCH_BLOCK_REASON_LABELS: Record<
  OfficeReviewQueueBatchBlockReason,
  string
> = {
  missing_customer_id: "Missing customer on job record",
  invoice_already_exists: "Active invoice already on file",
  job_not_completed: "Job is not completed",
  no_open_labor_entries: "No open labor entries to review",
  no_pending_expenses: "No pending expenses to review",
};

const BATCH_ACTION_ORDER: OfficeReviewQueueBulkActionId[] = [
  "create_invoices",
  "review_expenses",
  "review_labor",
  "open_jobs",
];

function jobNeedsInvoice(item: OfficeReviewQueueItem): boolean {
  return (
    item.kind === "awaiting_invoicing" ||
    item.reviewReasons.includes("no_active_invoice")
  );
}

function jobHasActiveInvoice(item: OfficeReviewQueueItem): boolean {
  return !jobNeedsInvoice(item);
}

function isCompletedQueueJob(item: OfficeReviewQueueItem): boolean {
  if (item.kind === "stalled_job") {
    return false;
  }

  if (item.jobStatus != null && item.jobStatus !== "completed") {
    return false;
  }

  return true;
}

function resolveCreateInvoicesEligibility(
  item: OfficeReviewQueueItem,
): OfficeReviewQueueBatchJobEligibility {
  const blockedReasons: OfficeReviewQueueBatchBlockReason[] = [];

  if (!isValidOfficeReviewQueueCustomerId(item.customerId)) {
    blockedReasons.push("missing_customer_id");
  }

  if (!isCompletedQueueJob(item)) {
    blockedReasons.push("job_not_completed");
  }

  if (jobHasActiveInvoice(item)) {
    blockedReasons.push("invoice_already_exists");
  }

  return {
    jobId: item.jobId,
    jobNumber: item.jobNumber,
    eligible: blockedReasons.length === 0,
    blockedReasons,
  };
}

function resolveReviewExpensesEligibility(
  item: OfficeReviewQueueItem,
): OfficeReviewQueueBatchJobEligibility {
  const blockedReasons: OfficeReviewQueueBatchBlockReason[] = [];

  if (!item.reviewReasons.includes("pending_expenses")) {
    blockedReasons.push("no_pending_expenses");
  }

  return {
    jobId: item.jobId,
    jobNumber: item.jobNumber,
    eligible: blockedReasons.length === 0,
    blockedReasons,
  };
}

function resolveReviewLaborEligibility(
  item: OfficeReviewQueueItem,
): OfficeReviewQueueBatchJobEligibility {
  const blockedReasons: OfficeReviewQueueBatchBlockReason[] = [];

  if (!item.reviewReasons.includes("open_labor_entries")) {
    blockedReasons.push("no_open_labor_entries");
  }

  return {
    jobId: item.jobId,
    jobNumber: item.jobNumber,
    eligible: blockedReasons.length === 0,
    blockedReasons,
  };
}

function resolveOpenJobsEligibility(
  item: OfficeReviewQueueItem,
): OfficeReviewQueueBatchJobEligibility {
  const blockedReasons: OfficeReviewQueueBatchBlockReason[] = [];

  if (!isValidOfficeReviewQueueJobId(item.jobId)) {
    blockedReasons.push("job_not_completed");
  }

  return {
    jobId: item.jobId,
    jobNumber: item.jobNumber,
    eligible: blockedReasons.length === 0,
    blockedReasons,
  };
}

/** Per-job eligibility for a single batch action — read-only, client-side heuristics. */
export function resolveQueueBatchEligibility(
  item: OfficeReviewQueueItem,
  actionId: OfficeReviewQueueBulkActionId,
): OfficeReviewQueueBatchJobEligibility {
  switch (actionId) {
    case "create_invoices":
      return resolveCreateInvoicesEligibility(item);
    case "review_expenses":
      return resolveReviewExpensesEligibility(item);
    case "review_labor":
      return resolveReviewLaborEligibility(item);
    case "open_jobs":
      return resolveOpenJobsEligibility(item);
  }
}

function summarizeBlockedReasons(
  jobs: OfficeReviewQueueBatchJobEligibility[],
): OfficeReviewQueueBatchBlockedReasonSummary[] {
  const byReason = new Map<
    OfficeReviewQueueBatchBlockReason,
    { count: number; jobIds: string[] }
  >();

  for (const job of jobs) {
    if (job.eligible) {
      continue;
    }

    for (const reason of job.blockedReasons) {
      const existing = byReason.get(reason);
      if (existing) {
        existing.count += 1;
        existing.jobIds.push(job.jobId);
      } else {
        byReason.set(reason, { count: 1, jobIds: [job.jobId] });
      }
    }
  }

  return [...byReason.entries()]
    .map(([reason, { count, jobIds }]) => ({
      reason,
      label: BATCH_BLOCK_REASON_LABELS[reason],
      count,
      jobIds,
    }))
    .sort((left, right) => right.count - left.count);
}

function resolveRecommendedNextStep(
  actionId: OfficeReviewQueueBulkActionId,
  eligibleCount: number,
  blockedCount: number,
  totalSelected: number,
): string {
  if (totalSelected === 0) {
    return "Select queue items to preview what a future batch action would affect.";
  }

  if (eligibleCount === 0) {
    switch (actionId) {
      case "create_invoices":
        return "None of the selected jobs are ready for batch invoicing — resolve blockers on individual job pages first.";
      case "review_expenses":
        return "None of the selected jobs have pending expenses — use single-job shortcuts or pick different rows.";
      case "review_labor":
        return "None of the selected jobs have open labor entries — use single-job shortcuts or pick different rows.";
      case "open_jobs":
        return "Selected jobs cannot be opened in bulk — verify job links on individual queue rows.";
    }
  }

  if (blockedCount > 0) {
    switch (actionId) {
      case "create_invoices":
        return `${eligibleCount} of ${totalSelected} selected jobs would be eligible for batch invoicing — fix blockers on the rest before a future bulk run.`;
      case "review_expenses":
        return `${eligibleCount} of ${totalSelected} selected jobs have pending expenses to review — the rest have nothing to action.`;
      case "review_labor":
        return `${eligibleCount} of ${totalSelected} selected jobs have open labor to review — the rest have nothing to action.`;
      case "open_jobs":
        return `${eligibleCount} of ${totalSelected} selected jobs would open in a future batch navigation flow.`;
    }
  }

  switch (actionId) {
    case "create_invoices":
      return `All ${eligibleCount} selected jobs would be eligible for a future batch invoicing workflow.`;
    case "review_expenses":
      return `All ${eligibleCount} selected jobs have pending expenses that a future batch review would surface.`;
    case "review_labor":
      return `All ${eligibleCount} selected jobs have open labor that a future batch review would surface.`;
    case "open_jobs":
      return `All ${eligibleCount} selected jobs would open in a future batch navigation workflow.`;
  }
}

/** Builds a read-only preview for one batch action over the current selection. */
export function buildQueueBatchPreview(
  selectedItems: OfficeReviewQueueItem[],
  actionId: OfficeReviewQueueBulkActionId,
): OfficeReviewQueueBatchPreview {
  const jobs = selectedItems.map((item) =>
    resolveQueueBatchEligibility(item, actionId),
  );
  const eligibleJobIds = jobs
    .filter((job) => job.eligible)
    .map((job) => job.jobId);
  const blockedJobIds = jobs
    .filter((job) => !job.eligible)
    .map((job) => job.jobId);

  return {
    actionId,
    label: BATCH_ACTION_LABELS[actionId],
    totalSelected: selectedItems.length,
    eligibleCount: eligibleJobIds.length,
    blockedCount: blockedJobIds.length,
    eligibleJobIds,
    blockedJobIds,
    blockedReasons: summarizeBlockedReasons(jobs),
    jobs,
    recommendedNextStep: resolveRecommendedNextStep(
      actionId,
      eligibleJobIds.length,
      blockedJobIds.length,
      selectedItems.length,
    ),
    previewOnly: true,
  };
}

export function buildAllQueueBatchPreviews(
  selectedItems: OfficeReviewQueueItem[],
): OfficeReviewQueueBatchPreview[] {
  return BATCH_ACTION_ORDER.map((actionId) =>
    buildQueueBatchPreview(selectedItems, actionId),
  );
}

/** Compact headline/detail for preview UI surfaces. */
export function summarizeQueueBatchPreview(
  preview: OfficeReviewQueueBatchPreview,
): OfficeReviewQueueBatchPreviewSummary {
  const { actionId, label, totalSelected, eligibleCount, blockedCount } =
    preview;

  if (totalSelected === 0) {
    return {
      actionId,
      label,
      headline: "No jobs selected",
      detail: "Select queue rows to see what this batch action would affect.",
      recommendedNextStep: preview.recommendedNextStep,
    };
  }

  if (eligibleCount === 0) {
    return {
      actionId,
      label,
      headline: `0 of ${totalSelected} jobs eligible`,
      detail:
        preview.blockedReasons.length > 0
          ? preview.blockedReasons
              .slice(0, 3)
              .map((entry) => `${entry.label} (${entry.count})`)
              .join(" · ")
          : "All selected jobs are blocked for this action.",
      recommendedNextStep: preview.recommendedNextStep,
    };
  }

  if (blockedCount === 0) {
    return {
      actionId,
      label,
      headline: `${eligibleCount} job${eligibleCount === 1 ? "" : "s"} eligible`,
      detail: "Every selected job would be included in a future batch run.",
      recommendedNextStep: preview.recommendedNextStep,
    };
  }

  return {
    actionId,
    label,
    headline: `${eligibleCount} eligible · ${blockedCount} blocked`,
    detail:
      preview.blockedReasons.length > 0
        ? preview.blockedReasons
            .slice(0, 3)
            .map((entry) => `${entry.label} (${entry.count})`)
            .join(" · ")
        : `${blockedCount} selected job${blockedCount === 1 ? "" : "s"} would be skipped.`,
    recommendedNextStep: preview.recommendedNextStep,
  };
}

// TODO(office-review-queue-bulk-v2): Bulk invoicing workflow execution for eligible previews.
// TODO(office-review-queue-bulk-v2): Queue assignment batching and ownership routing.
// TODO(office-review-queue-bulk-v2): AI batch recommendations from preview + trend signals.
// TODO(office-review-queue-bulk-v2): Workflow simulation with dry-run writes and rollback.
