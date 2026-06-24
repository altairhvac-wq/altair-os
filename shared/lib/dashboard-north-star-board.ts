import { buildDispatchPressureSnapshot } from "@/shared/lib/dashboard-dispatch-pressure";
import {
  formatAcceptedEstimateSchedulingDescription,
  formatAcceptedEstimateSchedulingListHref,
  formatAcceptedEstimateSchedulingTitle,
} from "@/shared/lib/accepted-estimate-scheduling";
import {
  DISPATCH_PAGE_TODAY_HREF,
  DISPATCH_PAGE_UNASSIGNED_HREF,
} from "@/shared/lib/dispatch-page-focus";
import {
  INVOICE_PAGE_CASH_FLOW_HREF,
  INVOICE_PAGE_DRAFT_HREF,
  INVOICE_PAGE_OVERDUE_HREF,
  INVOICE_PAGE_UNPAID_HREF,
} from "@/shared/lib/invoice-page-focus";
import {
  formatLeadEstimateReadyDescription,
  formatLeadEstimateReadyTitle,
  formatNewLeadContactDescription,
  formatNewLeadContactTitle,
  LEADS_NEEDS_CONTACT_QUEUE_HREF,
  LEADS_QUALIFIED_QUEUE_HREF,
} from "@/shared/lib/lead-dashboard-attention";
import { buildNorthStarHeroContent } from "@/shared/lib/dashboard-north-star-hero";
import type { MobileActionSeverity } from "@/shared/lib/mobile-action-dashboard";
import type { OperationalResolutionQueueType } from "@/shared/lib/operational-resolution-queue";
import type {
  DashboardData,
  DashboardTechnicianStatus,
} from "@/shared/types/dashboard";
import { formatCurrency } from "@/shared/types/customer";
import {
  formatDispatchStatus,
  formatDispatchTime,
  type DispatchJob,
} from "@/shared/types/dispatch";
import { formatExpenseAmount } from "@/shared/types/expense";
import type { OfficeReviewQueueItemKind } from "@/shared/types/office-review-queue";

export type NorthStarBoardRowKind = "queue" | "link" | "static";

export type NorthStarBoardRow = {
  id: string;
  title: string;
  meta: string;
  count?: number;
  amount?: string;
  progress?: number;
  severity?: MobileActionSeverity;
  featured?: boolean;
  kind: NorthStarBoardRowKind;
  queueType?: OperationalResolutionQueueType;
  href?: string;
};

export type NorthStarBoardWorkJobRow = {
  id: string;
  time: string;
  customer: string;
  detail: string;
  status: string;
  href: string;
};

export type NorthStarBoardTechnicianRow = {
  id: string;
  initials: string;
  name: string;
  jobLabel: string;
};

export type NorthStarBoardOfficeFollowUp = {
  id: string;
  title: string;
  meta: string;
  href?: string;
};

export type NorthStarBoardConnection = {
  id: string;
  from: string;
  to: string;
  note: string;
};

export type NorthStarBoardDispatchPressure = {
  label: string;
  meta: string;
  href: string;
  severity: "healthy" | "warning" | "critical";
};

export type NorthStarBoardStatusMetric = {
  label: string;
  value: number;
};

export type NorthStarBoardInset = {
  label: string;
  amount: string;
  meta: string;
  href?: string;
};

export type NorthStarBoardColumnContent = {
  rows: NorthStarBoardRow[];
  emptyMessage: string;
};

export type NorthStarBoardWorkContent = {
  summary: string;
  dispatchPressure: NorthStarBoardDispatchPressure | null;
  statusMetrics: NorthStarBoardStatusMetric[];
  unassignedRow: NorthStarBoardRow | null;
  jobRows: NorthStarBoardWorkJobRow[];
  remainingJobCount: number;
  technicians: NorthStarBoardTechnicianRow[];
  dispatchHref: string;
  timeHref: string;
  emptyMessage: string;
};

export type NorthStarBoardMoneyContent = {
  rows: NorthStarBoardRow[];
  expenseInset: NorthStarBoardInset | null;
  leadOpportunityInset: NorthStarBoardInset | null;
  billingHref: string;
  emptyMessage: string;
};

export type NorthStarBoardContent = {
  featuredQueueType: OperationalResolutionQueueType | null;
  connections: NorthStarBoardConnection[];
  action: NorthStarBoardColumnContent & {
    officeFollowUps: NorthStarBoardOfficeFollowUp[];
    viewAllHref?: string;
  };
  work: NorthStarBoardWorkContent;
  money: NorthStarBoardMoneyContent;
};

const ACTION_JOB_PREVIEW_LIMIT = 4;
const TECHNICIAN_PREVIEW_LIMIT = 4;
const OFFICE_FOLLOW_UP_LIMIT = 2;

const OFFICE_KIND_LABELS: Record<OfficeReviewQueueItemKind, string> = {
  completed_work_review: "Needs review",
  operational_inconsistency: "Data integrity",
  awaiting_invoicing: "Awaiting invoicing",
  stalled_job: "Stalled job",
};

function pluralize(
  count: number,
  singular: string,
  plural = `${singular}s`,
): string {
  return count === 1 ? singular : plural;
}

function formatJobLocation(city?: string, state?: string): string {
  if (city && state) {
    return `${city}, ${state}`;
  }
  return city ?? state ?? "Location pending";
}

function formatTechnicianState(technician: DashboardTechnicianStatus): string {
  return technician.timeState.replaceAll("_", " ");
}

function resolveProgress(count: number, cap = 10): number {
  if (count <= 0) {
    return 0;
  }
  return Math.min(100, Math.round((count / cap) * 100));
}

function resolveAmountProgress(amount: number, total: number): number {
  if (amount <= 0 || total <= 0) {
    return 0;
  }
  return Math.min(100, Math.round((amount / total) * 100));
}

function markFeatured(
  row: NorthStarBoardRow,
  featuredQueueType: OperationalResolutionQueueType | null,
): NorthStarBoardRow {
  if (!featuredQueueType || row.queueType !== featuredQueueType) {
    return row;
  }
  return { ...row, featured: true };
}

function buildActionRow(
  input: Omit<NorthStarBoardRow, "featured">,
  featuredQueueType: OperationalResolutionQueueType | null,
): NorthStarBoardRow | null {
  if ((input.count ?? 0) <= 0 && input.kind !== "static") {
    return null;
  }
  return markFeatured(input, featuredQueueType);
}

function resolveTechnicianLabel(
  job: DispatchJob,
  technicians: DashboardTechnicianStatus[],
): string {
  if (!job.technicianId) {
    return "Unassigned";
  }

  return (
    technicians.find((technician) => technician.id === job.technicianId)?.name ??
    "Assigned"
  );
}

function buildWorkJobRow(
  job: DispatchJob,
  technicians: DashboardTechnicianStatus[],
  canManageCustomers: boolean,
): NorthStarBoardWorkJobRow {
  const technicianLabel = resolveTechnicianLabel(job, technicians);
  const location = formatJobLocation(job.city, job.state);

  return {
    id: job.id,
    time: formatDispatchTime(job.scheduledDate),
    customer: canManageCustomers ? job.customerName : "Customer",
    detail: `${job.jobType} · ${technicianLabel} · ${location}`,
    status: formatDispatchStatus(job.status),
    href: `/jobs/${job.id}`,
  };
}

function buildOfficeFollowUps(data: DashboardData): NorthStarBoardOfficeFollowUp[] {
  if (!data.access.canViewOperationalReports) {
    return [];
  }

  const items = data.officeReviewQueue.summary.items;
  if (items.length === 0) {
    return [];
  }

  return items.slice(0, OFFICE_FOLLOW_UP_LIMIT).map((item) => ({
    id: item.jobId,
    title: `${item.jobNumber} · ${item.customerName}`,
    meta: `${OFFICE_KIND_LABELS[item.kind]} · ${item.agingLabel}`,
    href: `/jobs/${item.jobId}`,
  }));
}

function buildActionRows(
  data: DashboardData,
  featuredQueueType: OperationalResolutionQueueType | null,
): NorthStarBoardRow[] {
  const {
    access,
    money,
    completedWorkAwaitingInvoicing,
    completedWorkReview,
    officeReviewQueue,
    stalledJobs,
    newLeadsNeedingContact,
    leadsReadyForEstimate,
    acceptedEstimatesNeedingScheduling,
  } = data;
  const rows: NorthStarBoardRow[] = [];

  const push = (row: Omit<NorthStarBoardRow, "featured"> | null) => {
    if (!row) {
      return;
    }
    const built = buildActionRow(row, featuredQueueType);
    if (built) {
      rows.push(built);
    }
  };

  if (access.canViewBilling && money.overdueCount > 0) {
    push({
      id: "overdue-invoices",
      title: "Overdue invoices",
      meta: `${money.overdueCount} past due · ${formatCurrency(money.overdueTotal)}`,
      count: money.overdueCount,
      severity: "critical",
      kind: "queue",
      queueType: "overdue_invoice",
      href: INVOICE_PAGE_OVERDUE_HREF,
    });
  }

  if (access.canViewOperationalReports && completedWorkAwaitingInvoicing.count > 0) {
    push({
      id: "ready-to-invoice",
      title: "Ready to invoice",
      meta: `${completedWorkAwaitingInvoicing.count} completed ${pluralize(completedWorkAwaitingInvoicing.count, "job")} awaiting billing`,
      count: completedWorkAwaitingInvoicing.count,
      severity:
        completedWorkAwaitingInvoicing.count >= 5 ? "critical" : "warning",
      kind: "queue",
      queueType: "ready_to_invoice",
      href: "/reports?queue=invoicing",
    });
  }

  if (
    access.canViewBilling &&
    acceptedEstimatesNeedingScheduling.count > 0
  ) {
    const count = acceptedEstimatesNeedingScheduling.count;
    push({
      id: "accepted-estimates-scheduling",
      title: formatAcceptedEstimateSchedulingTitle(count),
      meta: formatAcceptedEstimateSchedulingDescription(count),
      count,
      severity: count >= 3 ? "warning" : "info",
      kind: "queue",
      queueType: "accepted_estimate_scheduling",
      href: formatAcceptedEstimateSchedulingListHref(count),
    });
  }

  if (access.canViewOperationalReports && stalledJobs.stalledCount > 0) {
    push({
      id: "stalled-jobs",
      title: "Stalled jobs",
      meta: `${stalledJobs.stalledCount} ${pluralize(stalledJobs.stalledCount, "job")} · ${stalledJobs.inactivityThresholdDays}+ days inactive`,
      count: stalledJobs.stalledCount,
      severity: stalledJobs.stalledCount >= 5 ? "critical" : "warning",
      kind: "queue",
      queueType: "stalled_job",
      href: "/reports?queue=stalled",
    });
  }

  if (access.canViewOperationalReports) {
    const officeReviewCount =
      officeReviewQueue.summary.criticalCount +
      officeReviewQueue.summary.needsAttentionCount;
    const needsReviewCount = Math.max(
      officeReviewCount,
      completedWorkReview.count,
    );

    if (needsReviewCount > 0) {
      push({
        id: "needs-review",
        title: "Completed work review",
        meta: `${needsReviewCount} ${pluralize(needsReviewCount, "item")} need office review`,
        count: needsReviewCount,
        severity:
          officeReviewQueue.summary.criticalCount > 0 ? "critical" : "warning",
        kind: "queue",
        queueType: "needs_review",
        href:
          officeReviewQueue.summary.criticalCount > 0
            ? "/reports?queue=critical"
            : "/reports?queue=attention",
      });
    }
  }

  if (access.canViewBilling && money.staleSentEstimateCount > 0) {
    push({
      id: "stale-sent-estimates",
      title: "Stale sent estimates",
      meta: `${money.staleSentEstimateCount} sent ${pluralize(money.staleSentEstimateCount, "estimate")} · ${money.staleSentEstimateThresholdDays}+ days`,
      count: money.staleSentEstimateCount,
      severity: money.staleSentEstimateCount >= 5 ? "critical" : "warning",
      kind: "queue",
      queueType: "stale_sent_estimate",
      href: "/estimates?status=sent",
    });
  }

  if (access.canManageCustomers && newLeadsNeedingContact.count > 0) {
    const count = newLeadsNeedingContact.count;
    push({
      id: "new-lead-contact",
      title: formatNewLeadContactTitle(count),
      meta: formatNewLeadContactDescription(count),
      count,
      severity: count >= 3 ? "critical" : "warning",
      kind: "queue",
      queueType: "new_lead_contact",
      href: LEADS_NEEDS_CONTACT_QUEUE_HREF,
    });
  }

  if (access.canManageCustomers && leadsReadyForEstimate.count > 0) {
    const count = leadsReadyForEstimate.count;
    push({
      id: "lead-estimate-ready",
      title: formatLeadEstimateReadyTitle(count),
      meta: formatLeadEstimateReadyDescription(count),
      count,
      severity: count >= 5 ? "warning" : "info",
      kind: "queue",
      queueType: "lead_estimate_ready",
      href: LEADS_QUALIFIED_QUEUE_HREF,
    });
  }

  if (access.canViewBilling && money.unsentInvoiceCount > 0) {
    push({
      id: "unsent-invoices",
      title: "Draft invoices",
      meta: `${money.unsentInvoiceCount} unsent ${pluralize(money.unsentInvoiceCount, "invoice")}`,
      count: money.unsentInvoiceCount,
      severity: money.unsentInvoiceCount >= 5 ? "critical" : "warning",
      kind: "queue",
      queueType: "unsent_invoice",
      href: INVOICE_PAGE_DRAFT_HREF,
    });
  }

  if (access.canViewBilling && money.unsentEstimateCount > 0) {
    push({
      id: "unsent-estimates",
      title: "Unsent estimates",
      meta: `${money.unsentEstimateCount} draft ${pluralize(money.unsentEstimateCount, "estimate")}`,
      count: money.unsentEstimateCount,
      severity: money.unsentEstimateCount >= 5 ? "critical" : "warning",
      kind: "queue",
      queueType: "unsent_estimate",
      href: "/estimates",
    });
  }

  return rows;
}

function buildMoneyRows(
  data: DashboardData,
  featuredQueueType: OperationalResolutionQueueType | null,
): NorthStarBoardRow[] {
  const { access, money, expenses } = data;
  const rows: NorthStarBoardRow[] = [];

  const push = (row: Omit<NorthStarBoardRow, "featured"> | null) => {
    if (!row) {
      return;
    }
    const built = buildActionRow(row, featuredQueueType);
    if (built) {
      rows.push(built);
    }
  };

  if (!access.canViewBilling) {
    return rows;
  }

  const billingPressureTotal = money.unpaidTotal + money.overdueTotal;

  if (money.unpaidCount > 0) {
    push({
      id: "unpaid-invoices",
      title: "Unpaid invoices",
      meta: `${money.unpaidCount} open · ${formatCurrency(money.unpaidTotal)}`,
      count: money.unpaidCount,
      amount: formatCurrency(money.unpaidTotal),
      progress: resolveAmountProgress(money.unpaidTotal, billingPressureTotal),
      severity: "warning",
      kind: "link",
      href: INVOICE_PAGE_UNPAID_HREF,
    });
  }

  if (money.overdueCount > 0) {
    push({
      id: "money-overdue-invoices",
      title: "Overdue invoices",
      meta: `${money.overdueCount} past due · ${formatCurrency(money.overdueTotal)}`,
      count: money.overdueCount,
      amount: formatCurrency(money.overdueTotal),
      progress: resolveAmountProgress(money.overdueTotal, billingPressureTotal),
      severity: "critical",
      kind: "queue",
      queueType: "overdue_invoice",
      href: INVOICE_PAGE_OVERDUE_HREF,
    });
  }

  if (money.paymentsTodayCount > 0 || money.paymentsTodayTotal > 0) {
    push({
      id: "payments-today",
      title: "Payments today",
      meta: `${money.paymentsTodayCount} ${pluralize(money.paymentsTodayCount, "payment")} recorded`,
      count: money.paymentsTodayCount,
      amount: formatCurrency(money.paymentsTodayTotal),
      progress: 100,
      severity: "info",
      kind: "link",
      href: INVOICE_PAGE_CASH_FLOW_HREF,
    });
  }

  if (money.unsentInvoiceCount > 0) {
    push({
      id: "money-unsent-invoices",
      title: "Unsent invoices",
      meta: `${money.unsentInvoiceCount} draft ${pluralize(money.unsentInvoiceCount, "invoice")}`,
      count: money.unsentInvoiceCount,
      progress: resolveProgress(money.unsentInvoiceCount),
      severity: "warning",
      kind: "queue",
      queueType: "unsent_invoice",
      href: INVOICE_PAGE_DRAFT_HREF,
    });
  }

  if (money.unsentEstimateCount > 0) {
    push({
      id: "money-unsent-estimates",
      title: "Unsent estimates",
      meta: `${money.unsentEstimateCount} draft ${pluralize(money.unsentEstimateCount, "estimate")}`,
      count: money.unsentEstimateCount,
      progress: resolveProgress(money.unsentEstimateCount),
      severity: "warning",
      kind: "queue",
      queueType: "unsent_estimate",
      href: "/estimates",
    });
  }

  return rows;
}

function buildConnections(data: DashboardData): NorthStarBoardConnection[] {
  const connections: NorthStarBoardConnection[] = [];

  if (
    data.access.canViewOperationalReports &&
    data.completedWorkAwaitingInvoicing.count > 0
  ) {
    connections.push({
      id: "jobs-invoices",
      from: "Jobs",
      to: "Invoices",
      note: `${data.completedWorkAwaitingInvoicing.count} ready to bill`,
    });
  }

  if (
    data.operations.unassignedToday > 0 ||
    data.operations.overloadedTechnicianCount > 0
  ) {
    const note =
      data.operations.unassignedToday > 0
        ? `${data.operations.unassignedToday} unassigned today`
        : `${data.operations.overloadedTechnicianCount} overloaded techs`;
    connections.push({
      id: "crew-dispatch",
      from: "Crew",
      to: "Dispatch",
      note,
    });
  }

  return connections;
}

function buildWorkContent(data: DashboardData): NorthStarBoardWorkContent {
  const { access, operations, technicians } = data;
  const dispatchPressure = buildDispatchPressureSnapshot(data);
  const previewJobs = operations.todayJobs.slice(0, ACTION_JOB_PREVIEW_LIMIT);
  const remainingJobCount = Math.max(
    0,
    operations.todayJobs.length - previewJobs.length,
  );

  const unassignedRow =
    operations.unassignedToday > 0
      ? ({
          id: "unassigned-jobs",
          title: "Unassigned jobs",
          meta: `${operations.unassignedToday} ${pluralize(operations.unassignedToday, "job")} need a technician`,
          count: operations.unassignedToday,
          severity:
            operations.unassignedToday >= 3 ? ("critical" as const) : ("warning" as const),
          kind: "queue" as const,
          queueType: "unassigned_job" as const,
          href: DISPATCH_PAGE_UNASSIGNED_HREF,
        } satisfies NorthStarBoardRow)
      : null;

  return {
    summary: `${operations.totalJobsToday} ${pluralize(operations.totalJobsToday, "job")} on the board · ${operations.unassignedToday} unassigned`,
    dispatchPressure: {
      label: dispatchPressure.statusLabel,
      meta: dispatchPressure.headline,
      href: dispatchPressure.primaryHref,
      severity: dispatchPressure.severity,
    },
    statusMetrics: [
      { label: "Scheduled", value: operations.scheduledToday },
      { label: "En route", value: operations.dispatched },
      { label: "In progress", value: operations.inProgress },
      { label: "Completed", value: operations.completedToday },
    ],
    unassignedRow,
    jobRows: previewJobs.map((job) =>
      buildWorkJobRow(job, technicians, access.canManageCustomers),
    ),
    remainingJobCount,
    technicians: access.canViewTechnicianRoster
      ? technicians.slice(0, TECHNICIAN_PREVIEW_LIMIT).map((technician) => ({
          id: technician.id,
          initials: technician.initials,
          name: technician.name,
          jobLabel: formatTechnicianState(technician),
        }))
      : [],
    dispatchHref: DISPATCH_PAGE_TODAY_HREF,
    timeHref: "/time",
    emptyMessage: "No work scheduled today",
  };
}

function buildMoneyContent(
  data: DashboardData,
  featuredQueueType: OperationalResolutionQueueType | null,
): NorthStarBoardMoneyContent {
  const { access, expenses } = data;
  const rows = buildMoneyRows(data, featuredQueueType);

  const expenseInset =
    access.canViewCompanyExpenses && expenses.submittedCount > 0
      ? {
          label: "Parts & expenses",
          amount: formatExpenseAmount(expenses.submittedTotal),
          meta: `${expenses.submittedCount} ${pluralize(expenses.submittedCount, "receipt")} to review`,
          href: "/expenses?status=submitted",
        }
      : null;

  const leadOpportunityInset = null;

  return {
    rows,
    expenseInset,
    leadOpportunityInset,
    billingHref: access.canViewBilling ? INVOICE_PAGE_CASH_FLOW_HREF : "/reports",
    emptyMessage: "No billing pressure right now",
  };
}

/**
 * Maps existing production dashboard data into North Star operating board rows.
 * Reuses hero priority selection for featured queue dedupe — no new scoring.
 */
export function buildNorthStarBoardContent(data: DashboardData): NorthStarBoardContent {
  const hero = buildNorthStarHeroContent(data);
  const featuredQueueType = hero.primary?.relatedQueue ?? null;
  const actionRows = buildActionRows(data, featuredQueueType);
  const officeFollowUps = buildOfficeFollowUps(data);

  return {
    featuredQueueType,
    connections: buildConnections(data),
    action: {
      rows: actionRows,
      officeFollowUps,
      viewAllHref: data.access.canViewOperationalReports ? "/reports" : undefined,
      emptyMessage: "No blockers right now",
    },
    work: buildWorkContent(data),
    money: buildMoneyContent(data, featuredQueueType),
  };
}
