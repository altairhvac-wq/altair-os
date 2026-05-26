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

/** Days threshold for the existing queue "aging" group (non-critical, 7+ days). */
export const OFFICE_REVIEW_QUEUE_AGING_DAYS = 7;

/** Inclusive upper bound for the fresh aging-intelligence bucket (0–2 days). */
export const OFFICE_REVIEW_QUEUE_FRESH_MAX_DAYS = 2;

/** Inclusive upper bound for the aging intelligence bucket (3–6 days). Overdue is 7+. */
export const OFFICE_REVIEW_QUEUE_AGING_BUCKET_MAX_DAYS = 6;

export type OfficeReviewQueueAgingBucket = "fresh" | "aging" | "overdue";

export type OfficeReviewQueueItemKind =
  | "completed_work_review"
  | "awaiting_invoicing"
  | "stalled_job";

export type OfficeReviewQueueSeverity = "critical" | "warning" | "info";

export type OfficeReviewQueueGroup = "critical" | "needs_attention" | "aging";

export type OfficeReviewQueueSortMode =
  | "severity_first"
  | "oldest_first"
  | "newest_first"
  | "blockers_first";

/** UI/query-param filter for the full reports queue view only. */
export type OfficeReviewQueueFilter =
  | "all"
  | "critical"
  | "aging"
  | "attention"
  | "invoicing"
  | "stalled";

const OFFICE_REVIEW_QUEUE_FILTER_VALUES: Exclude<
  OfficeReviewQueueFilter,
  "all"
>[] = ["critical", "aging", "attention", "invoicing", "stalled"];

export const OFFICE_REVIEW_QUEUE_FILTER_OPTIONS: {
  value: OfficeReviewQueueFilter;
  label: string;
}[] = [
  { value: "all", label: "All" },
  { value: "critical", label: "Critical" },
  { value: "aging", label: "Aging" },
  { value: "attention", label: "Needs attention" },
  { value: "invoicing", label: "Needs invoice" },
  { value: "stalled", label: "Stalled jobs" },
];

export type OfficeReviewQueueActionId =
  | "open_job"
  | "open_dispatch"
  | "create_invoice"
  | "review_expenses"
  | "review_labor"
  | "view_profitability";

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
  /** Heuristic operational age in whole days — independent of queue group assignment. */
  daysAging: number;
  /** Time-based intelligence bucket — orthogonal to critical / needs_attention / aging groups. */
  agingBucket: OfficeReviewQueueAgingBucket;
  agingLabel: string;
  /** True when a critical item has sat overdue (7+ days) — display escalation only, no SLA enforcement. */
  severityEscalated: boolean;
  blockerCount: number;
  reviewReasons: CompletedWorkReviewReason[];
  lastActivityAt: string | null;
  assignedTechnician?: string;
  jobStatus?: Job["status"];
  detail: string;
};

export type OfficeReviewQueueAgingBucketCounts = Record<
  OfficeReviewQueueAgingBucket,
  number
>;

export type OfficeReviewQueueSummary = {
  totalCount: number;
  criticalCount: number;
  needsAttentionCount: number;
  agingCount: number;
  agingBucketCounts: OfficeReviewQueueAgingBucketCounts;
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

export function parseOfficeReviewQueueFilter(
  value: string | undefined,
): OfficeReviewQueueFilter {
  if (
    value != null &&
    (OFFICE_REVIEW_QUEUE_FILTER_VALUES as readonly string[]).includes(value)
  ) {
    return value as Exclude<OfficeReviewQueueFilter, "all">;
  }

  return "all";
}

/**
 * Read-only view filter — does not change item priority, grouping assignment,
 * or underlying report data.
 */
export function filterOfficeReviewQueueItems(
  items: OfficeReviewQueueItem[],
  filter: OfficeReviewQueueFilter,
): OfficeReviewQueueItem[] {
  if (filter === "all") {
    return items;
  }

  switch (filter) {
    case "critical":
      return items.filter((item) => item.group === "critical");
    case "aging":
      return items.filter((item) => item.group === "aging");
    case "attention":
      return items.filter((item) => item.group === "needs_attention");
    case "invoicing":
      return items.filter((item) => item.kind === "awaiting_invoicing");
    case "stalled":
      return items.filter((item) => item.kind === "stalled_job");
  }
}

export function getOfficeReviewQueueFilterLabel(
  filter: OfficeReviewQueueFilter,
): string {
  return (
    OFFICE_REVIEW_QUEUE_FILTER_OPTIONS.find((option) => option.value === filter)
      ?.label ?? "All"
  );
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

const AGING_BUCKET_LABELS: Record<OfficeReviewQueueAgingBucket, string> = {
  fresh: "Fresh",
  aging: "Aging",
  overdue: "Overdue",
};

/**
 * Classifies operational age into read-only intelligence buckets.
 * Uses existing daysAging only — does not change queue group assignment.
 */
export function resolveOfficeReviewQueueAgingBucket(
  daysAging: number,
): OfficeReviewQueueAgingBucket {
  const days = normalizeOfficeReviewQueueDays(daysAging);

  if (days <= OFFICE_REVIEW_QUEUE_FRESH_MAX_DAYS) {
    return "fresh";
  }

  if (days <= OFFICE_REVIEW_QUEUE_AGING_BUCKET_MAX_DAYS) {
    return "aging";
  }

  return "overdue";
}

export function formatOfficeReviewQueueAgingBucket(
  bucket: OfficeReviewQueueAgingBucket,
): string {
  return AGING_BUCKET_LABELS[bucket];
}

export function countOfficeReviewQueueAgingBuckets(
  items: OfficeReviewQueueItem[],
): OfficeReviewQueueAgingBucketCounts {
  const counts: OfficeReviewQueueAgingBucketCounts = {
    fresh: 0,
    aging: 0,
    overdue: 0,
  };

  for (const item of items) {
    counts[item.agingBucket] += 1;
  }

  return counts;
}

function enrichQueueItemWithAgingMetadata(
  item: Omit<
    OfficeReviewQueueItem,
    "agingBucket" | "agingLabel" | "severityEscalated"
  >,
): OfficeReviewQueueItem {
  const agingBucket = resolveOfficeReviewQueueAgingBucket(item.daysAging);
  const severityEscalated =
    item.severity === "critical" && agingBucket === "overdue";

  return {
    ...item,
    agingBucket,
    agingLabel: formatOfficeReviewQueueAgingBucket(agingBucket),
    severityEscalated,
  };
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

  return enrichQueueItemWithAgingMetadata({
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
  });
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

  return enrichQueueItemWithAgingMetadata({
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
  });
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

  return enrichQueueItemWithAgingMetadata({
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
  });
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

  if (sortMode === "newest_first") {
    const agingDiff = left.daysAging - right.daysAging;
    if (agingDiff !== 0) {
      return agingDiff;
    }

    return SEVERITY_RANK[left.severity] - SEVERITY_RANK[right.severity];
  }

  if (sortMode === "blockers_first") {
    const blockerDiff = right.blockerCount - left.blockerCount;
    if (blockerDiff !== 0) {
      return blockerDiff;
    }

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

/** Heuristic priority when a completed-work row has multiple review reasons. */
const COMPLETED_WORK_PRIMARY_REASON_ORDER: CompletedWorkReviewReason[] = [
  "pending_expenses",
  "open_labor_entries",
  "no_active_invoice",
  "profitability_data_incomplete",
];

function jobProfitabilityAnchor(jobId: string): string {
  const encodedJobId = encodeURIComponent(jobId);
  return `/jobs/${encodedJobId}#job-profitability-heading-${jobId}`;
}

function buildOpenJobAction(jobId: string): OfficeReviewQueueAction {
  const encodedJobId = encodeURIComponent(jobId);
  return {
    id: "open_job",
    label: "Open job",
    href: `/jobs/${encodedJobId}`,
  };
}

function buildCreateInvoiceAction(
  jobId: string,
  customerId: string | undefined,
): OfficeReviewQueueAction {
  const encodedJobId = encodeURIComponent(jobId);
  const invoiceHref =
    customerId != null && customerId.trim().length > 0
      ? `/invoices?create=1&customerId=${encodeURIComponent(customerId)}&jobId=${encodedJobId}`
      : `/invoices?create=1&jobId=${encodedJobId}`;

  return {
    id: "create_invoice",
    label: "Create invoice",
    href: invoiceHref,
    external: true,
  };
}

function buildReviewExpensesAction(jobId: string): OfficeReviewQueueAction {
  return {
    id: "review_expenses",
    label: "Review expenses",
    href: `/expenses?jobId=${encodeURIComponent(jobId)}`,
    external: true,
  };
}

function buildReviewLaborAction(jobId: string): OfficeReviewQueueAction {
  return {
    id: "review_labor",
    label: "Review labor",
    href: `/time?jobId=${encodeURIComponent(jobId)}`,
    external: true,
  };
}

function buildViewProfitabilityAction(jobId: string): OfficeReviewQueueAction {
  return {
    id: "view_profitability",
    label: "View profitability",
    href: jobProfitabilityAnchor(jobId),
  };
}

function buildOpenDispatchAction(): OfficeReviewQueueAction {
  return {
    id: "open_dispatch",
    label: "Open dispatch",
    href: "/dispatch",
    external: true,
  };
}

function resolveCompletedWorkPrimaryReason(
  reasons: CompletedWorkReviewReason[],
): CompletedWorkReviewReason | null {
  for (const reason of COMPLETED_WORK_PRIMARY_REASON_ORDER) {
    if (reasons.includes(reason)) {
      return reason;
    }
  }

  return null;
}

function resolveActionForReviewReason(
  reason: CompletedWorkReviewReason,
  jobId: string,
  customerId: string | undefined,
): OfficeReviewQueueAction {
  switch (reason) {
    case "no_active_invoice":
      return buildCreateInvoiceAction(jobId, customerId);
    case "open_labor_entries":
      return buildReviewLaborAction(jobId);
    case "pending_expenses":
      return buildReviewExpensesAction(jobId);
    case "profitability_data_incomplete":
      return buildViewProfitabilityAction(jobId);
  }
}

/**
 * Picks the most likely next navigational step from existing queue metadata only.
 * Heuristic — does not inspect assignments, permissions, or live form state.
 */
export function resolvePrimaryQueueAction(
  item: OfficeReviewQueueItem,
): OfficeReviewQueueAction | null {
  if (!isValidOfficeReviewQueueJobId(item.jobId)) {
    return null;
  }

  const { jobId, customerId } = item;

  if (item.kind === "stalled_job") {
    return buildOpenJobAction(jobId);
  }

  if (item.kind === "awaiting_invoicing") {
    return buildCreateInvoiceAction(jobId, customerId);
  }

  const primaryReason = resolveCompletedWorkPrimaryReason(item.reviewReasons);
  if (primaryReason) {
    return resolveActionForReviewReason(primaryReason, jobId, customerId);
  }

  return buildOpenJobAction(jobId);
}

/**
 * Contextual navigational shortcuts for a queue row — primary action first, then
 * at most one secondary follow-up. No writes, prefills, or workflow automation.
 */
export function resolveQueueActions(
  item: OfficeReviewQueueItem,
): OfficeReviewQueueAction[] {
  const primary = resolvePrimaryQueueAction(item);
  if (!primary) {
    return [];
  }

  const actions: OfficeReviewQueueAction[] = [primary];

  if (item.kind === "stalled_job") {
    if (primary.id !== "open_dispatch") {
      actions.push(buildOpenDispatchAction());
    }
    return actions;
  }

  const openJob = buildOpenJobAction(item.jobId);
  if (primary.id !== openJob.id) {
    actions.push(openJob);
  }

  return actions;
}

/** @deprecated Use resolveQueueActions — kept for callers migrating incrementally. */
export function buildOfficeReviewQueueActions(
  item: OfficeReviewQueueItem,
): OfficeReviewQueueAction[] {
  return resolveQueueActions(item);
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
    "Aging intelligence buckets (Fresh / Aging / Overdue) are read-only heuristics based on days since last relevant activity — not SLA enforcement.",
    "No business-hours awareness, staffing-aware routing, or automated escalation yet.",
    "No SLA enforcement, queue assignments, or scheduling intelligence yet.",
    "Quick actions are navigational shortcuts only — no writes or approvals.",
    "Suggested next steps are heuristic only — based on queue kind and review flags, not assignments or live workflow state.",
    "No workflow automation, bulk actions, or assignment-aware routing yet.",
    "Stalled jobs are lower-priority context; they do not block invoicing or review closure.",
    "Read-only visibility — company-scoped from existing job, invoice, expense, and time records.",
  ];

  // TODO(office-review-queue-v2): Per-user queue assignments and ownership.
  // TODO(office-review-queue-v2): SLA timers with business-hours-aware due dates.
  // TODO(office-review-queue-v2): Escalation automation for overdue critical items.
  // TODO(office-review-queue-v2): AI prioritization and smart batching suggestions.
  // TODO(office-review-queue-v2): Staffing-aware queue routing by role and capacity.
  // TODO(office-review-queue-v2): Reminder automation for aging queue items.

  return {
    summary: {
      totalCount: items.length,
      criticalCount: groups.critical.length,
      needsAttentionCount: groups.needs_attention.length,
      agingCount: groups.aging.length,
      agingBucketCounts: countOfficeReviewQueueAgingBuckets(items),
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
      totalCount: report.summary.totalCount,
      agingBucketCounts: countOfficeReviewQueueAgingBuckets(items),
      groups,
      items,
    },
  };
}
