import type { CompanyAccessScope } from "@/lib/database/access-control";
import { recommendTechnicianForJob } from "@/shared/lib/dispatch-recommendations";
import {
  formatAcceptedEstimateSchedulingDescription,
  formatAcceptedEstimateSchedulingTitle,
} from "@/shared/lib/accepted-estimate-scheduling";
import {
  buildOperationalSignals,
  findOperationalSignal,
  formatLeadEstimateReadySignalDescription,
  formatNewLeadContactSignalDescription,
  formatStaleSentEstimatesSignalDescription,
  type OperationalSignal,
} from "@/shared/lib/operational-signals";
import type { OperationalResolutionQueueType } from "@/shared/lib/operational-resolution-queue";
import type {
  DashboardCompletedWorkAwaitingInvoicingSnapshot,
  DashboardCompletedWorkReviewSnapshot,
  DashboardData,
  DashboardMoneySnapshot,
  DashboardOperationsSummary,
} from "@/shared/types/dashboard";
import type { DispatchJob, DispatchJobPriority } from "@/shared/types/dispatch";
import type { DispatchTechnicianRecommendation } from "@/shared/types/dispatch-recommendations";
import type { OfficeReviewQueueReport } from "@/shared/types/office-review-queue";
import {
  formatLeadEstimateReadyTitle,
  formatNewLeadContactTitle,
} from "@/shared/lib/lead-dashboard-attention";
import { formatCurrency } from "@/shared/types/customer";

/** Transparent base scores — higher means higher office priority. */
export const OFFICE_PRIORITY_BASE_SCORES = {
  overdue_invoices: 100,
  ready_to_invoice: 90,
  unassigned_emergency: 85,
  unassigned_normal: 70,
  accepted_estimates_scheduling: 72,
  new_lead_contact: 58,
  stale_sent_estimates: 55,
  lead_estimate_ready: 52,
  draft_invoices: 65,
  draft_estimates: 45,
  needs_review: 40,
} as const;

export type OfficePriorityImpactCategory =
  | "cash_collection"
  | "revenue_capture"
  | "dispatch"
  | "office_review";

export type OfficePriorityActionType =
  | "collect_overdue"
  | "send_invoices"
  | "create_invoices"
  | "send_estimates"
  | "follow_up_sent_estimates"
  | "assign_job"
  | "schedule_accepted_estimates"
  | "contact_new_leads"
  | "prepare_lead_estimates"
  | "review_completed_jobs";

export type OfficePriorityRecommendation = {
  id: string;
  /** 1-based rank in the returned list (1 = highest). */
  priority: number;
  title: string;
  description: string;
  /** Plain-language explanation of why this score was assigned. */
  reason: string;
  impactCategory: OfficePriorityImpactCategory;
  score: number;
  actionType: OfficePriorityActionType;
  relatedQueue: OperationalResolutionQueueType;
  count: number;
  monetaryImpact?: number;
  dispatchRecommendation?: DispatchTechnicianRecommendation;
  /** When assign_job, the job surfaced for dispatch. */
  featuredJobId?: string;
};

export type OfficePriorityEngineInput = Pick<
  DashboardData,
  | "access"
  | "money"
  | "operations"
  | "completedWorkAwaitingInvoicing"
  | "acceptedEstimatesNeedingScheduling"
  | "completedWorkReview"
  | "officeReviewQueue"
  | "assignableTechnicians"
  | "technicians"
  | "newLeadsNeedingContact"
  | "leadsReadyForEstimate"
>;

const EMERGENCY_PRIORITIES = new Set<DispatchJobPriority>(["urgent", "high"]);
const MAX_RECOMMENDATIONS = 3;

function pluralize(
  count: number,
  singular: string,
  plural = `${singular}s`,
): string {
  return count === 1 ? singular : plural;
}

function sumUnsentInvoiceTotals(money: DashboardMoneySnapshot): number {
  return money.unsentInvoices.reduce(
    (total, invoice) => total + (Number.isFinite(invoice.total) ? invoice.total : 0),
    0,
  );
}

function sumReadyToInvoicePotential(
  snapshot: DashboardCompletedWorkAwaitingInvoicingSnapshot,
): number {
  return snapshot.jobs.reduce((total, entry) => {
    if (entry.approvedEstimateAmount == null) {
      return total;
    }
    return total + entry.approvedEstimateAmount;
  }, 0);
}

function pickFeaturedUnassignedJob(
  jobs: DispatchJob[],
): { job: DispatchJob; isEmergency: boolean } | null {
  if (jobs.length === 0) {
    return null;
  }

  const emergencyJobs = jobs.filter((job) => EMERGENCY_PRIORITIES.has(job.priority));
  const pool = emergencyJobs.length > 0 ? emergencyJobs : jobs;

  const sorted = [...pool].sort((left, right) => {
    const priorityRank: Record<DispatchJobPriority, number> = {
      urgent: 0,
      high: 1,
      normal: 2,
      low: 3,
    };
    const rankDiff = priorityRank[left.priority] - priorityRank[right.priority];
    if (rankDiff !== 0) {
      return rankDiff;
    }

    return (
      new Date(left.scheduledDate).getTime() -
      new Date(right.scheduledDate).getTime()
    );
  });

  const job = sorted[0];
  if (!job) {
    return null;
  }

  return { job, isEmergency: EMERGENCY_PRIORITIES.has(job.priority) };
}

function buildOverdueInvoicesCandidate(
  input: OfficePriorityEngineInput,
  signals: OperationalSignal[],
): OfficePriorityRecommendation | null {
  if (!input.access.canViewBilling) {
    return null;
  }

  const signal = findOperationalSignal(signals, "overdue_invoices");
  if (!signal) {
    return null;
  }

  const count = signal.count;
  const monetaryImpact = input.money.overdueTotal;

  return {
    id: "collect-overdue-invoices",
    priority: 0,
    title: `Collect on ${count} overdue ${pluralize(count, "invoice")}`,
    description:
      monetaryImpact > 0
        ? `${formatCurrency(monetaryImpact)} past due`
        : "Past-due balances need follow-up",
    reason: `${OFFICE_PRIORITY_BASE_SCORES.overdue_invoices} priority — overdue invoices block cash collection and score highest in the office priority model.`,
    impactCategory: "cash_collection",
    score: OFFICE_PRIORITY_BASE_SCORES.overdue_invoices,
    actionType: "collect_overdue",
    relatedQueue: "overdue_invoice",
    count,
    monetaryImpact,
  };
}

function buildReadyToInvoiceCandidate(
  input: OfficePriorityEngineInput,
  signals: OperationalSignal[],
): OfficePriorityRecommendation | null {
  if (!input.access.canViewOperationalReports) {
    return null;
  }

  const signal = findOperationalSignal(signals, "ready_to_invoice");
  if (!signal) {
    return null;
  }

  const count = signal.count;
  const monetaryImpact = sumReadyToInvoicePotential(
    input.completedWorkAwaitingInvoicing,
  );

  return {
    id: "invoice-completed-work",
    priority: 0,
    title: `Invoice ${count} completed ${pluralize(count, "job")}`,
    description:
      monetaryImpact > 0
        ? `Potential receivables: ${formatCurrency(monetaryImpact)}`
        : "Finished work waiting for billing",
    reason: `${OFFICE_PRIORITY_BASE_SCORES.ready_to_invoice} priority — completed jobs without invoices delay revenue recognition.`,
    impactCategory: "revenue_capture",
    score: OFFICE_PRIORITY_BASE_SCORES.ready_to_invoice,
    actionType: "create_invoices",
    relatedQueue: "ready_to_invoice",
    count,
    monetaryImpact: monetaryImpact > 0 ? monetaryImpact : undefined,
  };
}

function buildUnassignedJobCandidate(
  input: OfficePriorityEngineInput,
  signals: OperationalSignal[],
): OfficePriorityRecommendation | null {
  if (!input.access.canViewTechnicianRoster) {
    return null;
  }

  const signal = findOperationalSignal(signals, "unassigned_jobs");
  if (!signal) {
    return null;
  }

  const featured = pickFeaturedUnassignedJob(input.operations.unassignedJobs);
  if (!featured) {
    return null;
  }

  const { job, isEmergency } = featured;
  const baseScore = isEmergency
    ? OFFICE_PRIORITY_BASE_SCORES.unassigned_emergency
    : OFFICE_PRIORITY_BASE_SCORES.unassigned_normal;

  const dispatchRecommendation = recommendTechnicianForJob({
    job,
    technicians: input.assignableTechnicians,
    technicianStatuses: input.technicians,
    todayJobs: input.operations.todayJobs,
  });

  const jobLabel = job.jobType.trim() || "service call";
  const title = `Assign ${jobLabel}`;

  const description = dispatchRecommendation
    ? `Recommended technician: ${dispatchRecommendation.technicianName}`
    : `${input.operations.unassignedToday} ${pluralize(input.operations.unassignedToday, "job")} need a technician today`;

  const reason = isEmergency
    ? `${baseScore} priority — unassigned ${job.priority} job on today's board should be dispatched before normal backlog.`
    : `${baseScore} priority — unassigned jobs on today's board delay customer response and crew utilization.`;

  return {
    id: "assign-unassigned-job",
    priority: 0,
    title,
    description,
    reason,
    impactCategory: "dispatch",
    score: baseScore,
    actionType: "assign_job",
    relatedQueue: "unassigned_job",
    count: signal.count,
    dispatchRecommendation: dispatchRecommendation ?? undefined,
    featuredJobId: job.id,
  };
}

function buildAcceptedEstimateSchedulingCandidate(
  input: OfficePriorityEngineInput,
  signals: OperationalSignal[],
): OfficePriorityRecommendation | null {
  if (!input.access.canViewBilling) {
    return null;
  }

  const signal = findOperationalSignal(signals, "accepted_estimates_scheduling");
  if (!signal) {
    return null;
  }

  const count = signal.count;

  return {
    id: "schedule-accepted-estimates",
    priority: 0,
    title: formatAcceptedEstimateSchedulingTitle(count),
    description: formatAcceptedEstimateSchedulingDescription(count),
    reason: `${OFFICE_PRIORITY_BASE_SCORES.accepted_estimates_scheduling} priority — accepted estimates without scheduled work delay dispatch and revenue capture.`,
    impactCategory: "dispatch",
    score: OFFICE_PRIORITY_BASE_SCORES.accepted_estimates_scheduling,
    actionType: "schedule_accepted_estimates",
    relatedQueue: "accepted_estimate_scheduling",
    count,
  };
}

function buildNewLeadContactCandidate(
  input: OfficePriorityEngineInput,
  signals: OperationalSignal[],
): OfficePriorityRecommendation | null {
  if (!input.access.canManageCustomers) {
    return null;
  }

  const signal = findOperationalSignal(signals, "new_lead_contact");
  if (!signal) {
    return null;
  }

  const count = signal.count;

  return {
    id: "new-lead-contact",
    priority: 0,
    title: formatNewLeadContactTitle(count),
    description: formatNewLeadContactSignalDescription(count),
    reason: `${OFFICE_PRIORITY_BASE_SCORES.new_lead_contact} priority — new leads lose value quickly without first contact.`,
    impactCategory: "revenue_capture",
    score: OFFICE_PRIORITY_BASE_SCORES.new_lead_contact,
    actionType: "contact_new_leads",
    relatedQueue: "new_lead_contact",
    count,
  };
}

function buildLeadEstimateReadyCandidate(
  input: OfficePriorityEngineInput,
  signals: OperationalSignal[],
): OfficePriorityRecommendation | null {
  if (!input.access.canManageCustomers) {
    return null;
  }

  const signal = findOperationalSignal(signals, "lead_estimate_ready");
  if (!signal) {
    return null;
  }

  const count = signal.count;

  return {
    id: "lead-estimate-ready",
    priority: 0,
    title: formatLeadEstimateReadyTitle(count),
    description: formatLeadEstimateReadySignalDescription(count),
    reason: `${OFFICE_PRIORITY_BASE_SCORES.lead_estimate_ready} priority — qualified leads waiting for estimates delay the sales path to booked work.`,
    impactCategory: "revenue_capture",
    score: OFFICE_PRIORITY_BASE_SCORES.lead_estimate_ready,
    actionType: "prepare_lead_estimates",
    relatedQueue: "lead_estimate_ready",
    count,
  };
}

function buildDraftInvoicesCandidate(
  input: OfficePriorityEngineInput,
  _signals: OperationalSignal[],
): OfficePriorityRecommendation | null {
  if (!input.access.canViewBilling || input.money.unsentInvoiceCount === 0) {
    return null;
  }

  const count = input.money.unsentInvoiceCount;
  const monetaryImpact = sumUnsentInvoiceTotals(input.money);

  return {
    id: "send-draft-invoices",
    priority: 0,
    title: `Send ${count} ${pluralize(count, "invoice")}`,
    description:
      monetaryImpact > 0
        ? `Potential receivables: ${formatCurrency(monetaryImpact)}`
        : "Draft invoices ready to email customers",
    reason: `${OFFICE_PRIORITY_BASE_SCORES.draft_invoices} priority — draft invoices are approved work that has not been sent for payment.`,
    impactCategory: "revenue_capture",
    score: OFFICE_PRIORITY_BASE_SCORES.draft_invoices,
    actionType: "send_invoices",
    relatedQueue: "unsent_invoice",
    count,
    monetaryImpact: monetaryImpact > 0 ? monetaryImpact : undefined,
  };
}

function buildDraftEstimatesCandidate(
  input: OfficePriorityEngineInput,
  _signals: OperationalSignal[],
): OfficePriorityRecommendation | null {
  if (!input.access.canViewBilling || input.money.unsentEstimateCount === 0) {
    return null;
  }

  const count = input.money.unsentEstimateCount;

  return {
    id: "send-draft-estimates",
    priority: 0,
    title: `Send ${count} ${pluralize(count, "estimate")}`,
    description: "Draft estimates waiting for customer approval",
    reason: `${OFFICE_PRIORITY_BASE_SCORES.draft_estimates} priority — unsent estimates slow down sales follow-up and job booking.`,
    impactCategory: "revenue_capture",
    score: OFFICE_PRIORITY_BASE_SCORES.draft_estimates,
    actionType: "send_estimates",
    relatedQueue: "unsent_estimate",
    count,
  };
}

function buildStaleSentEstimatesCandidate(
  input: OfficePriorityEngineInput,
  signals: OperationalSignal[],
): OfficePriorityRecommendation | null {
  if (!input.access.canViewBilling) {
    return null;
  }

  const signal = findOperationalSignal(signals, "stale_sent_estimates");
  if (!signal) {
    return null;
  }

  const count = signal.count;

  return {
    id: "follow-up-sent-estimates",
    priority: 0,
    title: `Follow up ${count} sent ${pluralize(count, "estimate")} awaiting approval`,
    description: formatStaleSentEstimatesSignalDescription(count),
    reason: `${OFFICE_PRIORITY_BASE_SCORES.stale_sent_estimates} priority — sent estimates past the recovery threshold may need a reminder to close the sale.`,
    impactCategory: "revenue_capture",
    score: OFFICE_PRIORITY_BASE_SCORES.stale_sent_estimates,
    actionType: "follow_up_sent_estimates",
    relatedQueue: "stale_sent_estimate",
    count,
  };
}

function resolveNeedsReviewCount(
  input: OfficePriorityEngineInput,
): { count: number; source: "completed_work" | "office_queue" } | null {
  if (!input.access.canViewOperationalReports) {
    return null;
  }

  if (input.completedWorkReview.count > 0) {
    return { count: input.completedWorkReview.count, source: "completed_work" };
  }

  const officeCount =
    input.officeReviewQueue.summary.criticalCount +
    input.officeReviewQueue.summary.needsAttentionCount;

  if (officeCount > 0) {
    return { count: officeCount, source: "office_queue" };
  }

  return null;
}

function buildNeedsReviewCandidate(
  input: OfficePriorityEngineInput,
  _signals: OperationalSignal[],
): OfficePriorityRecommendation | null {
  const review = resolveNeedsReviewCount(input);
  if (!review) {
    return null;
  }

  const { count, source } = review;
  const title =
    source === "completed_work"
      ? `Review ${count} completed ${pluralize(count, "job")}`
      : `Review ${count} office queue ${pluralize(count, "item")}`;

  const description =
    source === "completed_work"
      ? "Waiting for office review"
      : "Office review queue needs attention";

  return {
    id: "review-needs-attention",
    priority: 0,
    title,
    description,
    reason: `${OFFICE_PRIORITY_BASE_SCORES.needs_review} priority — review blockers prevent invoicing, close-out, and dispatch follow-through.`,
    impactCategory: "office_review",
    score: OFFICE_PRIORITY_BASE_SCORES.needs_review,
    actionType: "review_completed_jobs",
    relatedQueue: "needs_review",
    count,
  };
}

const CANDIDATE_BUILDERS: ((
  input: OfficePriorityEngineInput,
  signals: OperationalSignal[],
) => OfficePriorityRecommendation | null)[] = [
  buildOverdueInvoicesCandidate,
  buildReadyToInvoiceCandidate,
  buildUnassignedJobCandidate,
  buildAcceptedEstimateSchedulingCandidate,
  buildNewLeadContactCandidate,
  buildLeadEstimateReadyCandidate,
  buildDraftInvoicesCandidate,
  buildStaleSentEstimatesCandidate,
  buildDraftEstimatesCandidate,
  buildNeedsReviewCandidate,
];

/**
 * Deterministic office priority recommendations from dashboard snapshot data.
 * No AI — scores are fixed weights plus transparent reason strings.
 */
export function buildOfficePriorityRecommendations(
  input: OfficePriorityEngineInput,
): OfficePriorityRecommendation[] {
  const signals = buildOperationalSignals(input);
  const ranked = CANDIDATE_BUILDERS.map((build) => build(input, signals))
    .filter(
      (recommendation): recommendation is OfficePriorityRecommendation =>
        recommendation !== null,
    )
    .sort((left, right) => right.score - left.score)
    .slice(0, MAX_RECOMMENDATIONS);

  return ranked.map((recommendation, index) => ({
    ...recommendation,
    priority: index + 1,
  }));
}

export function hasOfficePriorityRecommendations(
  input: OfficePriorityEngineInput,
): boolean {
  const signals = buildOperationalSignals(input);
  return CANDIDATE_BUILDERS.some((build) => build(input, signals) !== null);
}

/** Maps a recommendation to a mobile action card for the resolution queue sheet. */
export function recommendationToMobileActionCard(
  recommendation: OfficePriorityRecommendation,
): {
  id: string;
  label: string;
  count: number;
  severity: "critical" | "warning" | "info";
  description: string;
  category: "critical-operations" | "money-actions";
  queueType: OperationalResolutionQueueType;
  canFix: boolean;
} {
  const severity =
    recommendation.score >= OFFICE_PRIORITY_BASE_SCORES.unassigned_normal
      ? "critical"
      : recommendation.score >= OFFICE_PRIORITY_BASE_SCORES.draft_estimates
        ? "warning"
        : "info";

  const category =
    recommendation.impactCategory === "dispatch"
      ? "critical-operations"
      : recommendation.impactCategory === "office_review"
        ? "critical-operations"
        : "money-actions";

  return {
    id: `altair-${recommendation.id}`,
    label: recommendation.title,
    count: recommendation.count,
    severity,
    description: recommendation.description,
    category,
    queueType: recommendation.relatedQueue,
    canFix: true,
  };
}

export type OfficePriorityEngineSnapshot = {
  access: CompanyAccessScope;
  operations: Pick<
    DashboardOperationsSummary,
    "unassignedToday" | "unassignedJobs" | "todayJobs"
  >;
  money: Pick<
    DashboardMoneySnapshot,
    | "overdueCount"
    | "overdueTotal"
    | "unsentInvoiceCount"
    | "unsentEstimateCount"
    | "staleSentEstimateCount"
  >;
  acceptedEstimatesNeedingScheduling: Pick<
    DashboardData["acceptedEstimatesNeedingScheduling"],
    "count"
  >;
  completedWorkAwaitingInvoicing: Pick<
    DashboardCompletedWorkAwaitingInvoicingSnapshot,
    "count"
  >;
  completedWorkReview: Pick<DashboardCompletedWorkReviewSnapshot, "count">;
  officeReviewQueue: Pick<OfficeReviewQueueReport, "summary">;
  newLeadsNeedingContact: Pick<DashboardData["newLeadsNeedingContact"], "count">;
  leadsReadyForEstimate: Pick<DashboardData["leadsReadyForEstimate"], "count">;
};

/** Lightweight counts for diagnostics or future analytics hooks. */
export function summarizeOfficePriorityInputs(
  input: OfficePriorityEngineSnapshot,
): Record<string, number> {
  const needsReview =
    input.completedWorkReview.count > 0
      ? input.completedWorkReview.count
      : input.officeReviewQueue.summary.criticalCount +
        input.officeReviewQueue.summary.needsAttentionCount;

  return {
    overdueInvoices: input.money.overdueCount,
    readyToInvoice: input.completedWorkAwaitingInvoicing.count,
    unassignedToday: input.operations.unassignedToday,
    acceptedEstimatesScheduling:
      input.acceptedEstimatesNeedingScheduling.count,
    draftInvoices: input.money.unsentInvoiceCount,
    draftEstimates: input.money.unsentEstimateCount,
    staleSentEstimates: input.money.staleSentEstimateCount,
    newLeadsNeedingContact: input.newLeadsNeedingContact.count,
    leadsReadyForEstimate: input.leadsReadyForEstimate.count,
    needsReview,
  };
}
