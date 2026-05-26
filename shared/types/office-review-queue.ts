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

export function formatOfficeReviewQueueKind(
  kind: OfficeReviewQueueItemKind,
): string {
  return KIND_LABELS[kind];
}

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
): OfficeReviewQueueItem {
  const severity: OfficeReviewQueueSeverity = entry.severity;
  const daysAging = entry.daysSinceCompletion;

  return {
    jobId: entry.jobId,
    jobNumber: entry.jobNumber,
    customerId: customerIdByJobId.get(entry.jobId),
    customerName: entry.customerName,
    kind: "completed_work_review",
    severity,
    group: resolveQueueGroup({ severity, daysAging }),
    daysAging,
    blockerCount: entry.reviewReasons.length,
    reviewReasons: entry.reviewReasons,
    lastActivityAt: entry.completedAt,
    assignedTechnician: entry.assignedTechnician,
    detail: formatCompletedWorkInvoiceStatus(entry.invoiceStatus),
  };
}

function toAwaitingInvoicingQueueItem(
  entry: CompletedWorkAwaitingInvoicingReport["summary"]["jobs"][number],
  customerIdByJobId: Map<string, string>,
): OfficeReviewQueueItem {
  const severity: OfficeReviewQueueSeverity = "warning";
  const daysAging = entry.daysSinceCompletion;

  return {
    jobId: entry.jobId,
    jobNumber: entry.jobNumber,
    customerId: customerIdByJobId.get(entry.jobId),
    customerName: entry.customerName,
    kind: "awaiting_invoicing",
    severity,
    group: resolveQueueGroup({ severity, daysAging }),
    daysAging,
    blockerCount: 1,
    reviewReasons: ["no_active_invoice"],
    lastActivityAt: entry.completedAt,
    assignedTechnician: entry.assignedTechnician,
    detail: "No active invoice on file",
  };
}

function toStalledJobQueueItem(
  entry: StalledJobEntry,
  customerIdByJobId: Map<string, string>,
  inactivityThresholdDays: number,
): OfficeReviewQueueItem {
  const severity: OfficeReviewQueueSeverity =
    entry.daysSinceActivity >= OFFICE_REVIEW_QUEUE_AGING_DAYS
      ? "warning"
      : "info";
  const daysAging = entry.daysSinceActivity;

  return {
    jobId: entry.jobId,
    jobNumber: entry.jobNumber,
    customerId: customerIdByJobId.get(entry.jobId),
    customerName: entry.customerName,
    kind: "stalled_job",
    severity,
    group: resolveQueueGroup({ severity, daysAging }),
    daysAging,
    blockerCount: 0,
    reviewReasons: [],
    lastActivityAt: entry.lastActivityAt,
    assignedTechnician: entry.assignedTechnician,
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

  return right.daysAging - left.daysAging;
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
  const { jobId, customerId } = item;
  const invoiceHref =
    customerId != null
      ? `/invoices?create=1&customerId=${encodeURIComponent(customerId)}&jobId=${encodeURIComponent(jobId)}`
      : `/invoices?create=1&jobId=${encodeURIComponent(jobId)}`;

  return [
    {
      id: "open_job",
      label: "Open job",
      href: `/jobs/${jobId}`,
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
      href: `/expenses?jobId=${encodeURIComponent(jobId)}`,
      external: true,
    },
    {
      id: "review_labor",
      label: "Review labor",
      href: `/time?jobId=${encodeURIComponent(jobId)}`,
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
    input.completedWorkReview.summary.jobs.map((job) => job.jobId),
  );

  const items: OfficeReviewQueueItem[] = [
    ...input.completedWorkReview.summary.jobs.map((entry) =>
      toReviewQueueItem(entry, input.customerIdByJobId),
    ),
    ...input.awaitingInvoicing.summary.jobs
      .filter((entry) => !reviewJobIds.has(entry.jobId))
      .map((entry) =>
        toAwaitingInvoicingQueueItem(entry, input.customerIdByJobId),
      ),
    ...input.stalledJobs.summary.stalledJobs.map((entry) =>
      toStalledJobQueueItem(
        entry,
        input.customerIdByJobId,
        input.stalledJobs.summary.inactivityThresholdDays,
      ),
    ),
  ].sort((left, right) => compareOfficeReviewQueueItems(left, right, sortMode));

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
