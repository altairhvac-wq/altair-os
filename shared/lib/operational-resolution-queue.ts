import type { CompanyAccessScope } from "@/lib/database/access-control";
import { INVOICE_PAGE_DRAFT_HREF } from "@/shared/lib/invoice-page-focus";
import type { MobileActionSeverity } from "@/shared/lib/mobile-action-dashboard";
import { formatLeadFollowUpQueueTitle } from "@/shared/lib/leads/lead-status";
import type {
  DashboardAcceptedEstimateSchedulingPreview,
  DashboardLeadFollowUpPreview,
  DashboardOverdueInvoicePreview,
  DashboardStaleSentEstimatePreview,
  DashboardUnsentEstimatePreview,
  DashboardUnsentInvoicePreview,
} from "@/shared/types/dashboard";
import { formatCurrency } from "@/shared/types/customer";
import type { DispatchJob, Technician } from "@/shared/types/dispatch";
import type { DashboardTechnicianStatus } from "@/shared/types/dashboard";
import { ESTIMATE_RECOVERY_THRESHOLD_DAYS } from "@/shared/lib/estimate-recovery";
import { OFFICE_REVIEW_QUEUE_AGING_DAYS } from "@/shared/types/office-review-queue";
import type {
  CompletedWorkAwaitingInvoicingEntry,
  CompletedWorkReviewEntry,
  StalledJobEntry,
} from "@/shared/types/reports";
import { formatCompletedWorkReviewReasons } from "@/shared/types/reports";

/** Extensible queue identifiers for operational resolution workflows. */
export type OperationalResolutionQueueType =
  | "unassigned_job"
  | "ready_to_invoice"
  | "overdue_invoice"
  | "unsent_invoice"
  | "unsent_estimate"
  | "stale_sent_estimate"
  | "accepted_estimate_scheduling"
  | "needs_review"
  | "stalled_job"
  | "lead_follow_up";

export type OperationalResolutionActionKind =
  | "assign_technician"
  | "create_invoice"
  | "send_invoice"
  | "send_estimate"
  | "resend_estimate"
  | "record_payment"
  | "resend_invoice"
  | "open_record"
  | "open_lead";

/** Declarative primary action — adapters execute server/href behavior. */
export type OperationalResolutionAction = {
  kind: OperationalResolutionActionKind;
  label: string;
  /** When false, adapter hides the action (permissions / workflow). */
  enabled: boolean;
};

export type OperationalResolutionQueueItemBase = {
  id: string;
  queueType: OperationalResolutionQueueType;
  title: string;
  subtitle?: string;
  meta?: string;
  severity: MobileActionSeverity;
  primaryAction: OperationalResolutionAction;
  secondaryActions: OperationalResolutionAction[];
  openHref?: string;
};

export type UnassignedJobQueueItem = OperationalResolutionQueueItemBase & {
  queueType: "unassigned_job";
  job: DispatchJob;
};

export type ReadyToInvoiceQueueItem = OperationalResolutionQueueItemBase & {
  queueType: "ready_to_invoice";
  entry: CompletedWorkAwaitingInvoicingEntry;
};

export type OverdueInvoiceQueueItem = OperationalResolutionQueueItemBase & {
  queueType: "overdue_invoice";
  invoice: DashboardOverdueInvoicePreview;
};

export type UnsentInvoiceQueueItem = OperationalResolutionQueueItemBase & {
  queueType: "unsent_invoice";
  invoice: DashboardUnsentInvoicePreview;
};

export type UnsentEstimateQueueItem = OperationalResolutionQueueItemBase & {
  queueType: "unsent_estimate";
  estimate: DashboardUnsentEstimatePreview;
};

export type StaleSentEstimateQueueItem = OperationalResolutionQueueItemBase & {
  queueType: "stale_sent_estimate";
  estimate: DashboardStaleSentEstimatePreview;
};

export type AcceptedEstimateSchedulingQueueItem =
  OperationalResolutionQueueItemBase & {
    queueType: "accepted_estimate_scheduling";
    estimate: DashboardAcceptedEstimateSchedulingPreview;
  };

export type NeedsReviewQueueItem = OperationalResolutionQueueItemBase & {
  queueType: "needs_review";
  entry: CompletedWorkReviewEntry;
};

export type LeadFollowUpQueueItem = OperationalResolutionQueueItemBase & {
  queueType: "lead_follow_up";
  lead: DashboardLeadFollowUpPreview;
};

export type StalledJobQueueItem = OperationalResolutionQueueItemBase & {
  queueType: "stalled_job";
  entry: StalledJobEntry;
};

export type OperationalResolutionQueueItem =
  | UnassignedJobQueueItem
  | ReadyToInvoiceQueueItem
  | OverdueInvoiceQueueItem
  | UnsentInvoiceQueueItem
  | UnsentEstimateQueueItem
  | StaleSentEstimateQueueItem
  | AcceptedEstimateSchedulingQueueItem
  | NeedsReviewQueueItem
  | LeadFollowUpQueueItem
  | StalledJobQueueItem;

export type OperationalResolutionQueueSheetData = {
  items: OperationalResolutionQueueItem[];
  access: CompanyAccessScope;
  technicians: { id: string; name: string }[];
  assignableTechnicians: Technician[];
  technicianStatuses: DashboardTechnicianStatus[];
  todayJobs: DispatchJob[];
  /** Items in DB beyond the dashboard preview slice. */
  hiddenCount: number;
};

export type OperationalResolutionQueuePresentation = {
  queueType: OperationalResolutionQueueType;
  title: string;
  subtitle?: string;
  completionTitle: string;
  completionSubtitle?: string;
  relatedHref?: string;
  relatedLabel?: string;
  icon: "users" | "briefcase" | "dollar" | "file" | "clipboard";
  iconClassName: string;
};

const QUEUE_PRESENTATION: Record<
  OperationalResolutionQueueType,
  Omit<
    OperationalResolutionQueuePresentation,
    "title" | "subtitle" | "queueType"
  >
> = {
  unassigned_job: {
    completionTitle: "All jobs assigned",
    completionSubtitle: "Today's board has no unassigned jobs in this queue.",
    relatedHref: "/dispatch?focus=unassigned",
    relatedLabel: "Open dispatch board",
    icon: "users",
    iconClassName: "bg-amber-100 text-amber-700",
  },
  ready_to_invoice: {
    completionTitle: "Invoicing queue clear",
    completionSubtitle: "No completed jobs waiting for an invoice in this preview.",
    relatedHref: "/reports?queue=invoicing",
    relatedLabel: "View invoicing queue",
    icon: "briefcase",
    iconClassName: "bg-cyan-100 text-cyan-700",
  },
  overdue_invoice: {
    completionTitle: "Overdue invoices processed",
    completionSubtitle: "No overdue invoices remain in this preview.",
    relatedHref: "/invoices?focus=overdue",
    relatedLabel: "View all overdue",
    icon: "dollar",
    iconClassName: "bg-rose-100 text-rose-700",
  },
  unsent_invoice: {
    completionTitle: "All invoices sent",
    completionSubtitle: "No draft invoices waiting to send in this preview.",
    relatedHref: INVOICE_PAGE_DRAFT_HREF,
    relatedLabel: "View draft invoices",
    icon: "file",
    iconClassName: "bg-amber-100 text-amber-700",
  },
  unsent_estimate: {
    completionTitle: "All estimates sent",
    completionSubtitle: "No draft estimates waiting to send in this preview.",
    relatedHref: "/estimates",
    relatedLabel: "View all estimates",
    icon: "clipboard",
    iconClassName: "bg-cyan-100 text-cyan-700",
  },
  stale_sent_estimate: {
    completionTitle: "Sent estimates followed up",
    completionSubtitle:
      "No sent estimates past the recovery threshold remain in this preview.",
    relatedHref: "/estimates",
    relatedLabel: "View all estimates",
    icon: "clipboard",
    iconClassName: "bg-amber-100 text-amber-700",
  },
  accepted_estimate_scheduling: {
    completionTitle: "Accepted estimates scheduled",
    completionSubtitle:
      "No accepted estimates waiting for scheduling remain in this preview.",
    relatedHref: "/estimates?status=approved",
    relatedLabel: "View approved estimates",
    icon: "briefcase",
    iconClassName: "bg-cyan-100 text-cyan-700",
  },
  needs_review: {
    completionTitle: "Review queue clear",
    relatedHref: "/reports?queue=attention",
    relatedLabel: "Open review queue",
    icon: "clipboard",
    iconClassName: "bg-amber-100 text-amber-700",
  },
  stalled_job: {
    completionTitle: "Stalled jobs reviewed",
    relatedHref: "/reports?queue=stalled",
    relatedLabel: "View stalled jobs",
    icon: "briefcase",
    iconClassName: "bg-amber-100 text-amber-700",
  },
  lead_follow_up: {
    completionTitle: "Lead follow-ups complete",
    completionSubtitle: "No overdue lead follow-ups remain in this preview.",
    relatedHref: "/leads",
    relatedLabel: "Open leads",
    icon: "users",
    iconClassName: "bg-cyan-100 text-cyan-700",
  },
};

export function getOperationalResolutionQueuePresentation(
  queueType: OperationalResolutionQueueType,
  title: string,
  subtitle?: string,
): OperationalResolutionQueuePresentation {
  const config = QUEUE_PRESENTATION[queueType];
  return {
    queueType,
    title,
    subtitle,
    ...config,
  };
}

function buildCreateInvoiceHref(jobId: string): string {
  const params = new URLSearchParams({ create: "1", jobId });
  return `/invoices?${params.toString()}`;
}

function buildUnassignedJobItems(
  jobs: DispatchJob[],
  access: CompanyAccessScope,
  technicians: { id: string; name: string }[],
): UnassignedJobQueueItem[] {
  const canAssign =
    access.canViewTechnicianRoster && technicians.length > 0;

  return jobs.map((job) => ({
    id: job.id,
    queueType: "unassigned_job",
    title: `Job ${job.jobNumber}`,
    subtitle: job.customerName,
    meta: job.status,
    severity: "warning",
    openHref: `/jobs/${job.id}`,
    job,
    primaryAction: {
      kind: "assign_technician",
      label: "Assign technician",
      enabled: canAssign,
    },
    secondaryActions: [
      {
        kind: "open_record",
        label: "Open job",
        enabled: true,
      },
    ],
  }));
}

function buildReadyToInvoiceItems(
  entries: CompletedWorkAwaitingInvoicingEntry[],
  access: CompanyAccessScope,
): ReadyToInvoiceQueueItem[] {
  const canCreate = access.canViewBilling;

  return entries.map((entry) => {
    const revenueHint =
      entry.approvedEstimateAmount != null
        ? `Est. ${formatCurrency(entry.approvedEstimateAmount)}`
        : entry.daysSinceCompletion > 0
          ? `${entry.daysSinceCompletion}d since completion`
          : undefined;

    return {
      id: entry.jobId,
      queueType: "ready_to_invoice",
      title: `Job ${entry.jobNumber}`,
      subtitle: entry.customerName,
      meta: revenueHint,
      severity: "warning",
      openHref: `/jobs/${entry.jobId}`,
      entry,
      primaryAction: {
        kind: "create_invoice",
        label: "Create invoice",
        enabled: canCreate,
      },
      secondaryActions: [
        {
          kind: "open_record",
          label: "Open job",
          enabled: true,
        },
      ],
    };
  });
}

function buildOverdueInvoiceItems(
  invoices: DashboardOverdueInvoicePreview[],
  access: CompanyAccessScope,
): OverdueInvoiceQueueItem[] {
  const canManage = access.canViewBilling;

  return invoices.map((invoice) => ({
    id: invoice.id,
    queueType: "overdue_invoice",
    title: `Invoice ${invoice.invoiceNumber}`,
    subtitle: invoice.customerName,
    meta: `Due ${invoice.dueDate}`,
    severity: "critical",
    openHref: `/invoices/${invoice.id}`,
    invoice,
    primaryAction: {
      kind: "record_payment",
      label: "Record payment",
      enabled: canManage,
    },
    secondaryActions: [
      {
        kind: "resend_invoice",
        label: "Resend invoice",
        enabled: canManage,
      },
      {
        kind: "open_record",
        label: "Open invoice",
        enabled: true,
      },
    ],
  }));
}

function buildUnsentInvoiceItems(
  invoices: DashboardUnsentInvoicePreview[],
  access: CompanyAccessScope,
): UnsentInvoiceQueueItem[] {
  const canManage = access.canViewBilling;

  return invoices.map((invoice) => ({
    id: invoice.id,
    queueType: "unsent_invoice",
    title: `Invoice ${invoice.invoiceNumber}`,
    subtitle: invoice.customerName,
    meta: formatCurrency(invoice.total),
    severity: "warning",
    openHref: `/invoices/${invoice.id}`,
    invoice,
    primaryAction: {
      kind: "send_invoice",
      label: "Send invoice",
      enabled: canManage,
    },
    secondaryActions: [
      {
        kind: "open_record",
        label: "Open invoice",
        enabled: true,
      },
    ],
  }));
}

function buildNeedsReviewItems(
  entries: CompletedWorkReviewEntry[],
): NeedsReviewQueueItem[] {
  return entries.map((entry) => {
    const reasonPreview =
      entry.reviewReasons.length > 0
        ? formatCompletedWorkReviewReasons(entry.reviewReasons)
        : "Office review required";

    return {
      id: entry.jobId,
      queueType: "needs_review",
      title: `Job ${entry.jobNumber}`,
      subtitle: entry.customerName,
      meta: reasonPreview,
      severity: entry.severity === "critical" ? "critical" : "warning",
      openHref: `/jobs/${entry.jobId}`,
      entry,
      primaryAction: {
        kind: "open_record",
        label: "Open job",
        enabled: true,
      },
      secondaryActions: [],
    };
  });
}

function buildStalledJobItems(
  entries: StalledJobEntry[],
  inactivityThresholdDays: number,
): StalledJobQueueItem[] {
  return entries.map((entry) => {
    const daysAging = entry.daysSinceActivity;
    const severity: MobileActionSeverity =
      daysAging >= OFFICE_REVIEW_QUEUE_AGING_DAYS ? "warning" : "info";

    return {
      id: entry.jobId,
      queueType: "stalled_job",
      title: `Job ${entry.jobNumber}`,
      subtitle: entry.customerName,
      meta: `${inactivityThresholdDays}+ days without job activity`,
      severity,
      openHref: `/jobs/${entry.jobId}`,
      entry,
      primaryAction: {
        kind: "open_record",
        label: "Open job",
        enabled: true,
      },
      secondaryActions: [
        {
          kind: "open_record",
          label: "Open dispatch",
          enabled: true,
        },
      ],
    };
  });
}

function buildLeadFollowUpItems(
  leads: DashboardLeadFollowUpPreview[],
  access: CompanyAccessScope,
): LeadFollowUpQueueItem[] {
  const canManage = access.canManageCustomers;

  return leads.map((lead) => ({
    id: lead.id,
    queueType: "lead_follow_up",
    title: formatLeadFollowUpQueueTitle(lead),
    subtitle: lead.phone || lead.email || undefined,
    meta: lead.nextFollowUpAt
      ? `Due ${lead.nextFollowUpAt.slice(0, 10)}`
      : undefined,
    severity: "warning",
    openHref: `/leads?selected=${lead.id}`,
    lead,
    primaryAction: {
      kind: "open_lead",
      label: "Open lead",
      enabled: canManage,
    },
    secondaryActions: lead.phone
      ? [
          {
            kind: "open_record",
            label: "Call lead",
            enabled: true,
          },
        ]
      : [],
  }));
}

function buildUnsentEstimateItems(
  estimates: DashboardUnsentEstimatePreview[],
  access: CompanyAccessScope,
): UnsentEstimateQueueItem[] {
  const canManage = access.canViewBilling;

  return estimates.map((estimate) => ({
    id: estimate.id,
    queueType: "unsent_estimate",
    title: `Estimate ${estimate.estimateNumber}`,
    subtitle: estimate.customerName,
    meta: formatCurrency(estimate.total),
    severity: "warning",
    openHref: `/estimates/${estimate.id}`,
    estimate,
    primaryAction: {
      kind: "send_estimate",
      label: "Send estimate",
      enabled: canManage,
    },
    secondaryActions: [
      {
        kind: "open_record",
        label: "Open estimate",
        enabled: true,
      },
    ],
  }));
}

function buildStaleSentEstimateItems(
  estimates: DashboardStaleSentEstimatePreview[],
  access: CompanyAccessScope,
): StaleSentEstimateQueueItem[] {
  const canManage = access.canViewBilling;

  return estimates.map((estimate) => {
    const severity: MobileActionSeverity =
      estimate.daysSinceSent >= ESTIMATE_RECOVERY_THRESHOLD_DAYS
        ? "warning"
        : "info";

    return {
      id: estimate.id,
      queueType: "stale_sent_estimate",
      title: `Estimate ${estimate.estimateNumber}`,
      subtitle: estimate.customerName,
      meta: `${estimate.daysSinceSent}d since sent`,
      severity,
      openHref: `/estimates/${estimate.id}`,
      estimate,
      primaryAction: {
        kind: "resend_estimate",
        label: "Resend estimate",
        enabled: canManage,
      },
      secondaryActions: [
        {
          kind: "open_record",
          label: "Open estimate",
          enabled: true,
        },
      ],
    };
  });
}

function buildAcceptedEstimateSchedulingItems(
  estimates: DashboardAcceptedEstimateSchedulingPreview[],
): AcceptedEstimateSchedulingQueueItem[] {
  return estimates.map((estimate) => ({
    id: estimate.id,
    queueType: "accepted_estimate_scheduling",
    title: `Estimate ${estimate.estimateNumber}`,
    subtitle: estimate.customerName,
    meta: estimate.approvedAt
      ? `Approved ${estimate.approvedAt.slice(0, 10)} · ${formatCurrency(estimate.total)}`
      : formatCurrency(estimate.total),
    severity: "warning",
    openHref: estimate.openHref,
    estimate,
    primaryAction: {
      kind: "open_record",
      label: "Schedule job",
      enabled: true,
    },
    secondaryActions: [
      {
        kind: "open_record",
        label: estimate.jobId ? "Open job" : "Open estimate",
        enabled: true,
      },
    ],
  }));
}

export type BuildOperationalResolutionQueueInput = {
  queueType: OperationalResolutionQueueType;
  unassignedJobs: DispatchJob[];
  readyToInvoiceJobs: CompletedWorkAwaitingInvoicingEntry[];
  completedWorkReviewJobs: CompletedWorkReviewEntry[];
  overdueInvoices: DashboardOverdueInvoicePreview[];
  unsentInvoices: DashboardUnsentInvoicePreview[];
  unsentEstimates: DashboardUnsentEstimatePreview[];
  staleSentEstimates: DashboardStaleSentEstimatePreview[];
  staleSentEstimateThresholdDays: number;
  acceptedEstimatesNeedingScheduling: DashboardAcceptedEstimateSchedulingPreview[];
  leadFollowUps: DashboardLeadFollowUpPreview[];
  stalledJobs: StalledJobEntry[];
  stalledJobInactivityThresholdDays: number;
  technicians: { id: string; name: string }[];
  assignableTechnicians: Technician[];
  technicianStatuses: DashboardTechnicianStatus[];
  todayJobs: DispatchJob[];
  access: CompanyAccessScope;
  totalCount: number;
};

export function buildOperationalResolutionQueue(
  input: BuildOperationalResolutionQueueInput,
): OperationalResolutionQueueSheetData {
  const {
    queueType,
    unassignedJobs,
    readyToInvoiceJobs,
    completedWorkReviewJobs,
    overdueInvoices,
    unsentInvoices,
    unsentEstimates,
    staleSentEstimates,
    leadFollowUps,
    acceptedEstimatesNeedingScheduling,
    stalledJobs,
    stalledJobInactivityThresholdDays,
    technicians,
    assignableTechnicians,
    technicianStatuses,
    todayJobs,
    access,
    totalCount,
  } = input;

  let items: OperationalResolutionQueueItem[] = [];

  switch (queueType) {
    case "unassigned_job":
      items = buildUnassignedJobItems(
        unassignedJobs,
        access,
        technicians,
      );
      break;
    case "ready_to_invoice":
      items = buildReadyToInvoiceItems(readyToInvoiceJobs, access);
      break;
    case "overdue_invoice":
      items = buildOverdueInvoiceItems(overdueInvoices, access);
      break;
    case "unsent_invoice":
      items = buildUnsentInvoiceItems(unsentInvoices, access);
      break;
    case "unsent_estimate":
      items = buildUnsentEstimateItems(unsentEstimates, access);
      break;
    case "stale_sent_estimate":
      items = buildStaleSentEstimateItems(staleSentEstimates, access);
      break;
    case "accepted_estimate_scheduling":
      items = buildAcceptedEstimateSchedulingItems(
        acceptedEstimatesNeedingScheduling,
      );
      break;
    case "needs_review":
      items = buildNeedsReviewItems(completedWorkReviewJobs);
      break;
    case "lead_follow_up":
      items = buildLeadFollowUpItems(leadFollowUps, access);
      break;
    case "stalled_job":
      items = buildStalledJobItems(
        stalledJobs,
        stalledJobInactivityThresholdDays,
      );
      break;
    default:
      items = [];
  }

  return {
    items,
    access,
    technicians,
    assignableTechnicians,
    technicianStatuses,
    todayJobs,
    hiddenCount: Math.max(0, totalCount - items.length),
  };
}

export function getReadyToInvoiceHref(jobId: string): string {
  return buildCreateInvoiceHref(jobId);
}
