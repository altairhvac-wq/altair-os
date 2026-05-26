import type { Job } from "@/shared/types/job";
import type {
  CompletedWorkAwaitingInvoicingReport,
  CompletedWorkReviewEntry,
  CompletedWorkReviewReason,
  CompletedWorkReviewReport,
  ReportSectionMeta,
  StalledJobEntry,
  StalledJobsReport,
} from "@/shared/types/reports";
import {
  buildReportSectionMeta,
  formatCompletedWorkInvoiceStatus,
} from "@/shared/types/reports";

export const OFFICE_REVIEW_QUEUE_AGING_DAYS = 7;

export type OfficeReviewQueueItemKind =
  | "completed_work_review"
  | "awaiting_invoicing"
  | "stalled_job";

export type OfficeReviewQueueSeverity = "critical" | "warning" | "info";

export type OfficeReviewQueueGroup = "critical" | "needs_attention" | "aging";

export type OfficeReviewQueueSortMode = "oldest_first" | "severity_first";

export type OfficeReviewQueueActionId =
  | "open_job"
  | "create_invoice"
  | "review_expenses"
  | "review_labor";

export type OfficeReviewQueueAction = {
  id: OfficeReviewQueueActionId;
  label: string;
  href: string;
  external?: boolean;
};

export type OfficeReviewQueueItem = {
  jobId: string;
  jobNumber: string;
  customerId?: string;
  customerName: string;
  kind: OfficeReviewQueueItemKind;
  severity: OfficeReviewQueueSeverity;
  group: OfficeReviewQueueGroup;
  daysAging: number;
  blockerCount: number;
  reviewReasons: CompletedWorkReviewReason[];
  lastActivityAt: string | null;
  assignedTechnician?: string;
  jobStatus?: Job["status"];
  detail: string;
};

export type OfficeReviewQueueSummary = {
  totalCount: number;
  criticalCount: number;
  needsAttentionCount: number;
  agingCount: number;
  resolvedThisWeek: number;
  groups: Record<OfficeReviewQueueGroup, OfficeReviewQueueItem[]>;
  items: OfficeReviewQueueItem[];
};

export type OfficeReviewQueueReport = {
  summary: OfficeReviewQueueSummary;
  meta: ReportSectionMeta;
};

const SEVERITY_RANK: Record<OfficeReviewQueueSeverity, number> = {
  critical: 0,
  warning: 1,
  info: 2,
};

const GROUP_ORDER: Record<OfficeReviewQueueGroup, number> = {
  critical: 0,
  needs_attention: 1,
  aging: 2,
};

const KIND_LABELS: Record<OfficeReviewQueueItemKind, string> = {
  completed_work_review: "Needs review",
  awaiting_invoicing: "Awaiting invoicing",
  stalled_job: "Stalled job",
};

/** Lower rank wins when the same job appears in multiple source reports. */
const KIND_PRIORITY: Record<OfficeReviewQueueItemKind, number> = {
  completed_work_review: 0,
  awaiting_invoicing: 1,
  stalled_job: 2,
};

const FALLBACK_JOB_NUMBER = "Unknown job";
const FALLBACK_CUSTOMER_NAME = "Unknown customer";

export function isValidOfficeReviewQueueJobId(jobId: string | undefined): jobId is string {
  return typeof jobId === "string" && jobId.trim().length > 0;
}

export function sanitizeOfficeReviewQueueLabel(
  value: string | undefined | null,
  fallback: string,
): string {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : fallback;
}

export function normalizeOfficeReviewQueueDays(days: number): number {
  if (!Number.isFinite(days) || days < 0) {
    return 0;
  }

  return Math.floor(days);
}

export function formatOfficeReviewQueueKind(
  kind: OfficeReviewQueueItemKind,
): string {
  return KIND_LABELS[kind];
}

/**
 * Assigns exactly one group per item. Critical severity always wins over aging
 * even when daysAging exceeds the threshold — groups are mutually exclusive.
 */
function resolveQueueGroup(input: {
  severity: OfficeReviewQueueSeverity;
  daysAging: number;
}): OfficeReviewQueueGroup {
  if (input.severity === "critical") {
    return "critical";
  }

  if (input.daysAging >= OFFICE_REVIEW_QUEUE_AGING_DAYS) {
    return "aging";
  }

  return "needs_attention";
}

function toReviewQueueItem(
  entry: CompletedWorkReviewEntry,
  customerIdByJobId: Map<string, string>,
): OfficeReviewQueueItem | null {
  if (!isValidOfficeReviewQueueJobId(entry.jobId)) {
    return null;
  }

  const severity: OfficeReviewQueueSeverity = entry.severity;
  const daysAging = normalizeOfficeReviewQueueDays(entry.daysSinceCompletion);

  return {
    jobId: entry.jobId,
    jobNumber: sanitizeOfficeReviewQueueLabel(
      entry.jobNumber,
      FALLBACK_JOB_NUMBER,
    ),
    customerId: customerIdByJobId.get(entry.jobId),
    customerName: sanitizeOfficeReviewQueueLabel(
      entry.customerName,
      FALLBACK_CUSTOMER_NAME,
    ),
    kind: "completed_work_review",
    severity,
    group: resolveQueueGroup({ severity, daysAging }),
    daysAging,
    blockerCount: entry.reviewReasons.length,
    reviewReasons: entry.reviewReasons,
    lastActivityAt: entry.completedAt,
    assignedTechnician: entry.assignedTechnician?.trim() || undefined,
    detail: formatCompletedWorkInvoiceStatus(entry.invoiceStatus),
  };
}

function toAwaitingInvoicingQueueItem(
  entry: CompletedWorkAwaitingInvoicingReport["summary"]["jobs"][number],
  customerIdByJobId: Map<string, string>,
): OfficeReviewQueueItem | null {
  if (!isValidOfficeReviewQueueJobId(entry.jobId)) {
    return null;
  }

  const severity: OfficeReviewQueueSeverity = "warning";
  const daysAging = normalizeOfficeReviewQueueDays(entry.daysSinceCompletion);

  return {
    jobId: entry.jobId,
    jobNumber: sanitizeOfficeReviewQueueLabel(
      entry.jobNumber,
      FALLBACK_JOB_NUMBER,
    ),
    customerId: customerIdByJobId.get(entry.jobId),
    customerName: sanitizeOfficeReviewQueueLabel(
      entry.customerName,
      FALLBACK_CUSTOMER_NAME,
    ),
    kind: "awaiting_invoicing",
    severity,
    group: resolveQueueGroup({ severity, daysAging }),
    daysAging,
    blockerCount: 1,
    reviewReasons: ["no_active_invoice"],
    lastActivityAt: entry.completedAt,
    assignedTechnician: entry.assignedTechnician?.trim() || undefined,
    detail: "No active invoice on file",
  };
}

function toStalledJobQueueItem(
  entry: StalledJobEntry,
  customerIdByJobId: Map<string, string>,
  inactivityThresholdDays: number,
): OfficeReviewQueueItem | null {
  if (!isValidOfficeReviewQueueJobId(entry.jobId)) {
    return null;
  }

  const daysAging = normalizeOfficeReviewQueueDays(entry.daysSinceActivity);
  const severity: OfficeReviewQueueSeverity =
    daysAging >= OFFICE_REVIEW_QUEUE_AGING_DAYS ? "warning" : "info";

  return {
    jobId: entry.jobId,
    jobNumber: sanitizeOfficeReviewQueueLabel(
      entry.jobNumber,
      FALLBACK_JOB_NUMBER,
    ),
    customerId: customerIdByJobId.get(entry.jobId),
    customerName: sanitizeOfficeReviewQueueLabel(
      entry.customerName,
      FALLBACK_CUSTOMER_NAME,
    ),
    kind: "stalled_job",
    severity,
    group: resolveQueueGroup({ severity, daysAging }),
    daysAging,
    blockerCount: 0,
    reviewReasons: [],
    lastActivityAt: entry.lastActivityAt,
    assignedTechnician: entry.assignedTechnician?.trim() || undefined,
    jobStatus: entry.status,
    detail: `${inactivityThresholdDays}+ days without job activity`,
  };
}

export function compareOfficeReviewQueueItems(
  left: OfficeReviewQueueItem,
  right: OfficeReviewQueueItem,
  sortMode: OfficeReviewQueueSortMode,
): number {
  const groupDiff = GROUP_ORDER[left.group] - GROUP_ORDER[right.group];
  if (groupDiff !== 0) {
    return groupDiff;
  }

  if (sortMode === "oldest_first") {
    const agingDiff = right.daysAging - left.daysAging;
    if (agingDiff !== 0) {
      return agingDiff;
    }

    return SEVERITY_RANK[left.severity] - SEVERITY_RANK[right.severity];
  }

  const severityDiff =
    SEVERITY_RANK[left.severity] - SEVERITY_RANK[right.severity];
  if (severityDiff !== 0) {
    return severityDiff;
  }

  const agingDiff = right.daysAging - left.daysAging;
  if (agingDiff !== 0) {
    return agingDiff;
  }

  return left.jobNumber.localeCompare(right.jobNumber, undefined, {
    numeric: true,
    sensitivity: "base",
  });
}

/**
 * Keeps one row per jobId. Review entries beat invoicing backlog, which beat
 * stalled pipeline context when source reports overlap on bad/migrated data.
 */
export function dedupeOfficeReviewQueueItems(
  items: OfficeReviewQueueItem[],
): OfficeReviewQueueItem[] {
  const byJobId = new Map<string, OfficeReviewQueueItem>();

  for (const item of items) {
    const existing = byJobId.get(item.jobId);
    if (
      existing == null ||
      KIND_PRIORITY[item.kind] < KIND_PRIORITY[existing.kind]
    ) {
      byJobId.set(item.jobId, item);
    }
  }

  return [...byJobId.values()];
}

function groupQueueItems(
  items: OfficeReviewQueueItem[],
  sortMode: OfficeReviewQueueSortMode,
): Record<OfficeReviewQueueGroup, OfficeReviewQueueItem[]> {
  const groups: Record<OfficeReviewQueueGroup, OfficeReviewQueueItem[]> = {
    critical: [],
    needs_attention: [],
    aging: [],
  };

  for (const item of items) {
    groups[item.group].push(item);
  }

  for (const group of Object.keys(groups) as OfficeReviewQueueGroup[]) {
    groups[group].sort((left, right) =>
      compareOfficeReviewQueueItems(left, right, sortMode),
    );
  }

  return groups;
}

export function buildOfficeReviewQueueActions(
  item: OfficeReviewQueueItem,
): OfficeReviewQueueAction[] {
  if (!isValidOfficeReviewQueueJobId(item.jobId)) {
    return [];
  }

  const { jobId, customerId } = item;
  const encodedJobId = encodeURIComponent(jobId);
  const invoiceHref =
    customerId != null && customerId.trim().length > 0
      ? `/invoices?create=1&customerId=${encodeURIComponent(customerId)}&jobId=${encodedJobId}`
      : `/invoices?create=1&jobId=${encodedJobId}`;

  return [
    {
      id: "open_job",
      label: "Open job",
      href: `/jobs/${encodedJobId}`,
    },
    {
      id: "create_invoice",
      label: "Create invoice",
      href: invoiceHref,
      external: true,
    },
    {
      id: "review_expenses",
      label: "Review expenses",
      href: `/expenses?jobId=${encodedJobId}`,
      external: true,
    },
    {
      id: "review_labor",
      label: "Review labor",
      href: `/time?jobId=${encodedJobId}`,
      external: true,
    },
  ];
}

export function buildOfficeReviewQueueReport(input: {
  completedWorkReview: CompletedWorkReviewReport;
  awaitingInvoicing: CompletedWorkAwaitingInvoicingReport;
  stalledJobs: StalledJobsReport;
  resolvedThisWeek: number;
  customerIdByJobId: Map<string, string>;
  sortMode?: OfficeReviewQueueSortMode;
}): OfficeReviewQueueReport {
  const sortMode = input.sortMode ?? "severity_first";
  const reviewJobIds = new Set(
    input.completedWorkReview.summary.jobs
      .map((job) => job.jobId)
      .filter(isValidOfficeReviewQueueJobId),
  );
  const higherPriorityJobIds = new Set(reviewJobIds);

  const rawItems: OfficeReviewQueueItem[] = [
    ...input.completedWorkReview.summary.jobs
      .map((entry) => toReviewQueueItem(entry, input.customerIdByJobId))
      .filter((entry): entry is OfficeReviewQueueItem => entry != null),
    ...input.awaitingInvoicing.summary.jobs
      .filter(
        (entry) =>
          isValidOfficeReviewQueueJobId(entry.jobId) &&
          !reviewJobIds.has(entry.jobId),
      )
      .map((entry) => {
        higherPriorityJobIds.add(entry.jobId);
        return toAwaitingInvoicingQueueItem(entry, input.customerIdByJobId);
      })
      .filter((entry): entry is OfficeReviewQueueItem => entry != null),
    ...input.stalledJobs.summary.stalledJobs
      .filter(
        (entry) =>
          isValidOfficeReviewQueueJobId(entry.jobId) &&
          !higherPriorityJobIds.has(entry.jobId),
      )
      .map((entry) =>
        toStalledJobQueueItem(
          entry,
          input.customerIdByJobId,
          input.stalledJobs.summary.inactivityThresholdDays,
        ),
      )
      .filter((entry): entry is OfficeReviewQueueItem => entry != null),
  ];

  const items = dedupeOfficeReviewQueueItems(rawItems).sort((left, right) =>
    compareOfficeReviewQueueItems(left, right, sortMode),
  );

  const groups = groupQueueItems(items, sortMode);

  const limitations = [
    "Heuristic operational queue only — not a true approval workflow.",
    "Combines completed-work review, invoicing backlog, and stalled-job signals from existing reports.",
    "No SLA enforcement, queue assignments, or scheduling intelligence yet.",
    "Quick actions are navigational shortcuts only — no writes or approvals.",
    "Stalled jobs are lower-priority context; they do not block invoicing or review closure.",
    "Read-only visibility — company-scoped from existing job, invoice, expense, and time records.",
  ];

  // TODO(office-review-queue-v2): Per-user queue assignments and ownership.
  // TODO(office-review-queue-v2): SLA timers and overdue escalation.
  // TODO(office-review-queue-v2): AI prioritization and smart batching suggestions.
  // TODO(office-review-queue-v2): Reminder automation for aging queue items.

  return {
    summary: {
      totalCount: items.length,
      criticalCount: groups.critical.length,
      needsAttentionCount: groups.needs_attention.length,
      agingCount: groups.aging.length,
      resolvedThisWeek: input.resolvedThisWeek,
      groups,
      items,
    },
    meta: buildReportSectionMeta({
      dateRange: "all",
      dateBounds: null,
      limitations,
    }),
  };
}

export function sliceOfficeReviewQueueReport(
  report: OfficeReviewQueueReport,
  limit: number,
): OfficeReviewQueueReport {
  if (limit <= 0 || report.summary.items.length <= limit) {
    return report;
  }

  const items = report.summary.items.slice(0, limit);
  const groups = groupQueueItems(items, "severity_first");

  return {
    ...report,
    summary: {
      ...report.summary,
      groups,
      items,
    },
  };
}
