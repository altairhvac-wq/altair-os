import { selectDashboardAggregates } from "@/lib/database/services/dashboard-aggregate-bridge";
import {
  canViewCompanyTimeEntries,
  getCompanyAccessScope,
  type CompanyAccessScope,
} from "@/lib/database/access-control";
import type { ActiveCompanyContext } from "@/lib/database/types/core-tables";
import { COMPANY_ROLE_LABELS } from "@/lib/database/types/roles";
import { listCustomers } from "@/lib/database/queries/customers";
import { listDispatchJobsForToday } from "@/lib/database/queries/dispatch";
import { listLeads } from "@/lib/database/queries/leads";
import { listCompanyCardFailureAttentionAttempts } from "@/lib/database/queries/payment-attempts";
import { listCompanyPaymentDisputes } from "@/lib/database/queries/payment-disputes";
import {
  buildLeadDashboardAttentionPreview,
  selectLeadsNewNeedingFirstContact,
  selectLeadsReadyForEstimatePreparation,
} from "@/shared/lib/lead-dashboard-attention";
import {
  buildLeadPipelineMetrics,
  EMPTY_LEAD_PIPELINE_METRICS,
  selectLeadsNeedingFollowUp,
} from "@/shared/lib/leads/lead-metrics";
import { filterDailyOperationsSummaryForBillingAccess } from "@/shared/lib/dashboard-operational-insights-visibility";
import { listRecentOperationalActivitiesForCompany } from "@/lib/database/queries/dashboard";
import {
  getDashboardWorkflowRemindersForCompany,
} from "@/lib/database/queries/workflow-reminders";
import { listEstimates } from "@/lib/database/queries/estimates";
import { getJobSchedulingSnapshotsByIds } from "@/lib/database/queries/jobs";
import {
  buildAcceptedEstimateSchedulingPreview,
  selectAcceptedEstimatesNeedingScheduling,
} from "@/shared/lib/accepted-estimate-scheduling";
import {
  buildStaleSentEstimateEntries,
  ESTIMATE_RECOVERY_THRESHOLD_DAYS,
} from "@/shared/lib/estimate-recovery";
import {
  buildUnpaidInvoiceFollowUpEntries,
  UNPAID_INVOICE_FOLLOW_UP_THRESHOLD_DAYS,
} from "@/shared/lib/unpaid-invoice-follow-up";
import { listExpenses } from "@/lib/database/queries/expenses";
import { listInvoicesWithBillingSync } from "@/lib/database/services/invoice-billing";
import {
  getPaymentsLast7DaysDailyTotals,
  getPaymentsThisMonthSummary,
  getPaymentsThisWeekSummary,
  getPaymentsYesterdaySummary,
  listRecentPayments,
} from "@/lib/database/queries/invoice-payments";
import { isSameCalendarDayInTimeZone } from "@/shared/lib/datetime";
import {
  getUnreadNotificationCount,
  getUserNotifications,
} from "@/lib/database/queries/notifications";
import { listTechnicians } from "@/lib/database/queries/technicians";
import {
  listActiveTechnicianTimeEntries,
  listOpenClockEntriesForCompany,
  mapEntryTypeToTimeState,
} from "@/lib/database/queries/time-entries";
import { getDailyOperationsSummary } from "@/lib/database/services/operations/daily-operations-summary";
import { getCompanyOfficeReviewQueueReport } from "@/lib/database/services/reports/office-review-queue";
import { isOpenPaymentDisputeStatus } from "@/lib/payments";
import { filterCustomersForWorkQueue } from "@/shared/components/customers/customer-work-queues";
import { filterLeadsForListFilter } from "@/shared/components/leads/lead-work-queues";
import { getOverloadedTechnicianIds } from "@/shared/lib/dispatch-page-focus";
import { buildOperationalHealthReportFromOfficeQueue } from "@/shared/types/operational-health-report";
import type { DailyOperationsSummary } from "@/shared/types/daily-operations-summary";
import type { DashboardData } from "@/shared/types/dashboard";
import { getTodayOperationsSummary } from "@/shared/types/dashboard";
import {
  getInvoiceSummary,
  hasInvoiceUnpaidBalance,
} from "@/shared/types/invoice";
import { hasAssignedJobTechnician } from "@/shared/types/dispatch";
import type { OfficeReviewQueueReport } from "@/shared/types/office-review-queue";
import type { OperationalHealthReport } from "@/shared/types/operational-health-report";
import type { QueueResolutionTrendSummary } from "@/shared/types/queue-resolution-trends";
import { resolveReportDateBounds } from "@/shared/types/reports";
import { buildReportSectionMeta } from "@/shared/types/reports";
import { buildDashboardWorkflowReminderPreview } from "@/shared/lib/workflow-reminder-display";
import { buildShiftTimeTrackingSummary } from "@/shared/lib/time-tracking/shift-time-tracking-summary";
import type { Estimate } from "@/shared/types/estimate";
import type { TechnicianTimeState } from "@/shared/types/time-entry";
import type { TimeEntry } from "@/shared/types/time-entry";

const TODAY_JOBS_LIMIT = 8;
const PENDING_EXPENSES_LIMIT = 5;
const RECENT_RECEIPTS_LIMIT = 5;
const APPROVED_ESTIMATES_LIMIT = 5;
const RECENT_PAYMENTS_LIMIT = 5;
const RECENT_ACTIVITY_LIMIT = 10;
const RECENT_NOTIFICATIONS_LIMIT = 5;
const STALLED_JOBS_DASHBOARD_LIMIT = 5;
const COMPLETED_WORK_DASHBOARD_LIMIT = 5;
const COMPLETED_WORK_REVIEW_DASHBOARD_LIMIT = 5;
const UNASSIGNED_JOBS_DASHBOARD_LIMIT = 10;
const OVERDUE_INVOICES_DASHBOARD_LIMIT = 10;
const UNPAID_INVOICE_FOLLOW_UP_DASHBOARD_LIMIT = 10;
const UNSENT_INVOICES_DASHBOARD_LIMIT = 10;
const UNSENT_ESTIMATES_DASHBOARD_LIMIT = 10;
const STALE_SENT_ESTIMATES_DASHBOARD_LIMIT = 10;
const ACCEPTED_ESTIMATES_SCHEDULING_LIMIT = 10;
const LEAD_ATTENTION_DASHBOARD_LIMIT = 10;
const LEAD_FOLLOW_UP_DASHBOARD_LIMIT = 10;
const CUSTOMERS_NEEDING_INFO_DASHBOARD_LIMIT = 10;
const STALE_OPEN_SHIFTS_DASHBOARD_LIMIT = 10;
const PAYMENT_ATTENTION_DASHBOARD_LIMIT = 10;
/** Match Reports default lead pipeline period. */
const DASHBOARD_LEAD_PIPELINE_DATE_RANGE = "30d" as const;

const EMPTY_LEAD_ATTENTION: DashboardData["newLeadsNeedingContact"] = {
  count: 0,
  leads: [],
};

const EMPTY_LEAD_FOLLOW_UP: DashboardData["leadFollowUp"] = {
  count: 0,
  leads: [],
};

const EMPTY_ACCEPTED_ESTIMATES_SCHEDULING: DashboardData["acceptedEstimatesNeedingScheduling"] =
  {
    count: 0,
    estimates: [],
  };

const EMPTY_CUSTOMERS_NEEDING_INFO: DashboardData["customersNeedingInfo"] = {
  count: 0,
  customers: [],
};

const EMPTY_STALE_OPEN_SHIFTS: DashboardData["staleOpenShifts"] = {
  count: 0,
  shifts: [],
};

const EMPTY_PAYMENT_ATTENTION: DashboardData["paymentAttention"] = {
  cardFailureCount: 0,
  openDisputeCount: 0,
  cardFailures: [],
  openDisputes: [],
};

const EMPTY_LEAD_PIPELINE_SUMMARY: DashboardData["leadPipelineSummary"] = {
  totalLeads: 0,
  followUpsDue: 0,
  wonLeads: 0,
  lostLeads: 0,
  hasLeads: false,
  newLeadsToday: 0,
};

const EMPTY_WORKFLOW_REMINDERS: DashboardData["workflowReminders"] = {
  totalActiveCount: 0,
  visibleCount: 0,
  reminders: [],
};
/** Match admin layout fetch so React cache dedupes within the request. */
const NOTIFICATIONS_FETCH_LIMIT = 20;

const EMPTY_MONEY: DashboardData["money"] = {
  unpaidCount: 0,
  unpaidTotal: 0,
  overdueCount: 0,
  overdueTotal: 0,
  paymentsTodayCount: 0,
  paymentsTodayTotal: 0,
  paymentsYesterdayTotal: 0,
  paymentsThisWeekTotal: 0,
  paymentsThisMonthTotal: 0,
  paymentsLast7Days: [],
  recentPayments: [],
  approvedEstimates: [],
  overdueInvoices: [],
  unpaidInvoiceFollowUpCount: 0,
  unpaidInvoicesNeedingFollowUp: [],
  unpaidInvoiceFollowUpThresholdDays: UNPAID_INVOICE_FOLLOW_UP_THRESHOLD_DAYS,
  unsentInvoiceCount: 0,
  unsentInvoices: [],
  unsentEstimateCount: 0,
  unsentEstimates: [],
  staleSentEstimateCount: 0,
  staleSentEstimates: [],
  staleSentEstimateThresholdDays: ESTIMATE_RECOVERY_THRESHOLD_DAYS,
};

const EMPTY_EXPENSES: DashboardData["expenses"] = {
  submittedCount: 0,
  submittedTotal: 0,
  rejectedCount: 0,
  recentReceipts: [],
  pendingExpenses: [],
};

const EMPTY_REPORT_META = buildReportSectionMeta({
  dateRange: "30d",
  dateBounds: null,
  limitations: [],
});

const EMPTY_RESOLUTION_TREND: QueueResolutionTrendSummary = {
  resolvedThisWeek: 0,
  resolvedLastWeek: 0,
  weekOverWeekDelta: 0,
  rollingSevenDayAverage: 0,
  direction: "stable",
  headline: "Cleanup pace holding steady",
  detail: "No resolution activity recorded yet.",
  limitations: [],
};

const EMPTY_OFFICE_REVIEW_QUEUE: OfficeReviewQueueReport = {
  summary: {
    totalCount: 0,
    criticalCount: 0,
    needsAttentionCount: 0,
    agingCount: 0,
    agingBucketCounts: { fresh: 0, aging: 0, overdue: 0 },
    resolvedThisWeek: 0,
    resolutionTrend: EMPTY_RESOLUTION_TREND,
    groups: {
      critical: [],
      needs_attention: [],
      aging: [],
    },
    items: [],
  },
  meta: EMPTY_REPORT_META,
};

const EMPTY_OPERATIONAL_HEALTH: OperationalHealthReport = {
  operationalHealthScore: 0,
  operationalHealthLabel: "Healthy",
  operationalHealthTrend: "stable",
  strongestOperationalArea: {
    id: "office_queue",
    label: "Office review queue",
    score: 0,
  },
  biggestOperationalRisk: {
    id: "office_queue",
    label: "Office review queue",
    score: 0,
  },
  contributingFactors: [],
  areaScores: [],
  meta: EMPTY_REPORT_META,
};

const EMPTY_OPERATIONAL_INSIGHTS: DailyOperationsSummary = {
  generatedAt: new Date().toISOString(),
  sections: {
    revenue: {
      collectedRevenue: 0,
      outstandingRevenue: 0,
      todayCollectedRevenue: 0,
      todayPaymentCount: 0,
    },
    openJobs: { count: 0 },
    stalledJobs: {
      count: 0,
      inactivityThresholdDays: 0,
      stalledJobs: [],
    },
    pendingExpenses: { count: 0, totalAmount: 0 },
    activeTechnicians: { activeLaborEntries: 0, technicianCount: 0 },
    completedAwaitingInvoicing: { count: 0, jobs: [] },
    completedWorkReview: {
      count: 0,
      jobs: [],
      resolvedThisWeek: 0,
      resolutionTrend: EMPTY_RESOLUTION_TREND,
    },
    profitabilityWarnings: {
      jobsWithWarnings: 0,
      materialCostExceedsCollectedCount: 0,
    },
  },
  highlights: [],
  limitations: [],
};

const TIME_STATE_PRIORITY: Record<
  ReturnType<typeof mapEntryTypeToTimeState>,
  number
> = {
  on_break: 3,
  working_job: 2,
  clocked_in: 1,
};

function pickPrimaryActiveEntryForTechnician(
  entries: TimeEntry[],
): TimeEntry | undefined {
  return entries.reduce<TimeEntry | undefined>((best, entry) => {
    if (!best) {
      return entry;
    }

    const entryPriority = TIME_STATE_PRIORITY[mapEntryTypeToTimeState(entry.entryType)];
    const bestPriority = TIME_STATE_PRIORITY[mapEntryTypeToTimeState(best.entryType)];

    return entryPriority > bestPriority ? entry : best;
  }, undefined);
}

function buildTechnicianStatuses(
  technicians: Awaited<ReturnType<typeof listTechnicians>>,
  activeEntries: TimeEntry[],
): DashboardData["technicians"] {
  const entriesByTechnician = new Map<string, TimeEntry[]>();

  for (const entry of activeEntries) {
    const existing = entriesByTechnician.get(entry.technicianId) ?? [];
    existing.push(entry);
    entriesByTechnician.set(entry.technicianId, existing);
  }

  return technicians
    .filter((technician) => technician.role === COMPANY_ROLE_LABELS.technician)
    .map((technician) => {
      const technicianEntries = entriesByTechnician.get(technician.id) ?? [];
      const activeEntry = pickPrimaryActiveEntryForTechnician(technicianEntries);
      const jobLaborEntry = technicianEntries.find(
        (entry) => entry.entryType === "job_labor",
      );
      const timeState: TechnicianTimeState = activeEntry
        ? mapEntryTypeToTimeState(activeEntry.entryType)
        : technicianEntries.some((entry) => entry.entryType === "clock")
          ? "clocked_in"
          : "off_clock";

      return {
        id: technician.id,
        name: technician.name,
        initials: technician.initials,
        timeState,
        currentJobId: jobLaborEntry?.jobId,
        currentJobNumber: jobLaborEntry?.jobNumber,
      };
    });
}

function filterJobsForAccess<T extends { technicianId?: string | null }>(
  jobs: T[],
  access: CompanyAccessScope,
  userId: string,
): T[] {
  if (access.canViewAllJobs) {
    return jobs;
  }

  return jobs.filter((job) => job.technicianId === userId);
}

async function buildAcceptedEstimatesNeedingSchedulingSnapshot(
  companyId: string,
  estimates: Estimate[],
): Promise<{
  snapshot: DashboardData["acceptedEstimatesNeedingScheduling"];
  estimates: Estimate[];
}> {
  const approvedCandidates = estimates.filter(
    (estimate) =>
      estimate.status === "approved" &&
      !estimate.archivedAt &&
      !estimate.deletedAt,
  );
  const linkedJobIds = approvedCandidates
    .map((estimate) => estimate.jobId)
    .filter((jobId): jobId is string => Boolean(jobId));
  const jobsById = await getJobSchedulingSnapshotsByIds(companyId, linkedJobIds);
  const needingScheduling = selectAcceptedEstimatesNeedingScheduling(
    approvedCandidates,
    jobsById,
  );

  return {
    snapshot: {
      count: needingScheduling.length,
      estimates: needingScheduling
        .slice(0, ACCEPTED_ESTIMATES_SCHEDULING_LIMIT)
        .map(buildAcceptedEstimateSchedulingPreview),
    },
    estimates: needingScheduling,
  };
}

export async function getDashboardData(
  context: ActiveCompanyContext,
): Promise<DashboardData> {
  const access = getCompanyAccessScope(context);
  const companyId = context.company.id;
  const userId = context.user.id;

  const allTodayJobs = await listDispatchJobsForToday(companyId, {
    timeZone: context.company.timezone,
  });
  const todayJobs = filterJobsForAccess(allTodayJobs, access, userId);
  const todayOperationsSummary = getTodayOperationsSummary(todayJobs);
  const unassignedJobs = todayJobs
    .filter(
      (job) =>
        !hasAssignedJobTechnician(job) &&
        job.status !== "cancelled" &&
        job.status !== "completed",
    )
    .slice(0, UNASSIGNED_JOBS_DASHBOARD_LIMIT);

  const canViewTimeEntries = canViewCompanyTimeEntries(context);

  const [
    technicians,
    activeTimeEntries,
    invoices,
    estimates,
    expenses,
    recentPayments,
    paymentsYesterday,
    paymentsThisWeek,
    paymentsThisMonth,
    paymentsLast7Days,
    recentActivity,
    notifications,
    unreadCount,
    operationsSummary,
    officeReviewQueueReport,
    leads,
    workflowRemindersLoad,
    customers,
    openClockEntries,
    paymentDisputes,
    cardFailureAttempts,
  ] = await Promise.all([
    access.canViewTechnicianRoster
      ? listTechnicians(companyId, context, todayJobs)
      : Promise.resolve([]),
    access.canViewTechnicianRoster
      ? listActiveTechnicianTimeEntries(companyId)
      : Promise.resolve([]),
    access.canViewBilling
      ? listInvoicesWithBillingSync(companyId, context.company.timezone)
      : Promise.resolve([]),
    access.canViewBilling ? listEstimates(companyId) : Promise.resolve([]),
    access.canViewCompanyExpenses
      ? listExpenses(companyId)
      : Promise.resolve([]),
    access.canViewBilling
      ? listRecentPayments(companyId, RECENT_PAYMENTS_LIMIT)
      : Promise.resolve([]),
    access.canViewBilling
      ? getPaymentsYesterdaySummary(companyId, context.company.timezone)
      : Promise.resolve({ count: 0, total: 0 }),
    access.canViewBilling
      ? getPaymentsThisWeekSummary(companyId, context.company.timezone)
      : Promise.resolve({ count: 0, total: 0 }),
    access.canViewBilling
      ? getPaymentsThisMonthSummary(companyId, context.company.timezone)
      : Promise.resolve({ count: 0, total: 0 }),
    access.canViewBilling
      ? getPaymentsLast7DaysDailyTotals(companyId, context.company.timezone)
      : Promise.resolve([]),
    access.canViewOperationalReports
      ? listRecentOperationalActivitiesForCompany(
          companyId,
          RECENT_ACTIVITY_LIMIT,
          { includeBillingActivities: access.canViewBilling },
        )
      : Promise.resolve([]),
    getUserNotifications(companyId, userId, {
      limit: NOTIFICATIONS_FETCH_LIMIT,
    }),
    getUnreadNotificationCount(companyId, userId),
    access.canViewOperationalReports
      ? getDailyOperationsSummary(companyId, context.company.timezone)
      : Promise.resolve(EMPTY_OPERATIONAL_INSIGHTS),
    access.canViewOperationalReports
      ? getCompanyOfficeReviewQueueReport(companyId)
      : Promise.resolve(EMPTY_OFFICE_REVIEW_QUEUE),
    access.canManageCustomers
      ? listLeads(companyId, { includeLatestActivity: false })
      : Promise.resolve([]),
    access.canViewBilling
      ? getDashboardWorkflowRemindersForCompany(companyId)
      : Promise.resolve({ reminders: [], totalActiveCount: 0 }),
    access.canManageCustomers
      ? listCustomers(companyId)
      : Promise.resolve([]),
    canViewTimeEntries
      ? listOpenClockEntriesForCompany(companyId)
      : Promise.resolve([]),
    access.canViewBilling
      ? listCompanyPaymentDisputes(companyId, { limit: 50 })
      : Promise.resolve([]),
    access.canViewBilling
      ? listCompanyCardFailureAttentionAttempts(companyId, { limit: 50 })
      : Promise.resolve([]),
  ]);

  const leadPipelineDateBounds = resolveReportDateBounds(
    DASHBOARD_LEAD_PIPELINE_DATE_RANGE,
  )!;
  const leadPipelineMetrics = access.canManageCustomers
    ? buildLeadPipelineMetrics(
        leads,
        leadPipelineDateBounds,
        context.company.timezone,
      )
    : EMPTY_LEAD_PIPELINE_METRICS;
  const leadFollowUpLeads = access.canManageCustomers
    ? selectLeadsNeedingFollowUp(leads, {
        limit: LEAD_FOLLOW_UP_DASHBOARD_LIMIT,
        timeZone: context.company.timezone,
      })
    : [];
  const newLeadsNeedingContactAll = access.canManageCustomers
    ? selectLeadsNewNeedingFirstContact(leads, {
        timeZone: context.company.timezone,
      })
    : [];
  const leadsNeedingContactQueueAll = access.canManageCustomers
    ? filterLeadsForListFilter(
        leads,
        "needs-contact",
        context.company.timezone,
      )
    : [];
  const leadsReadyForEstimateAll = access.canManageCustomers
    ? selectLeadsReadyForEstimatePreparation(leads, {
        timeZone: context.company.timezone,
      })
    : [];
  const hasActiveLeads = access.canManageCustomers
    ? leads.some((lead) => !lead.deletedAt && !lead.archivedAt)
    : false;
  const newLeadsToday = access.canManageCustomers
    ? leads.filter((lead) =>
        isSameCalendarDayInTimeZone(
          lead.createdAt,
          new Date(),
          context.company.timezone,
        ),
      ).length
    : 0;
  const customersNeedingInfoAll = access.canManageCustomers
    ? filterCustomersForWorkQueue(customers, "needs-info")
    : [];
  const staleOpenShiftsAll = canViewTimeEntries
    ? buildShiftTimeTrackingSummary({
        openClockEntries,
        todayTimeEntries: [],
        timeZone: context.company.timezone,
      }).staleOpenShifts
    : [];
  const openDisputesAll = access.canViewBilling
    ? paymentDisputes.filter((dispute) =>
        isOpenPaymentDisputeStatus(dispute.status),
      )
    : [];
  const cardFailureCount = access.canViewBilling
    ? cardFailureAttempts.length
    : 0;
  const openDisputeCount = openDisputesAll.length;
  const technicianNameById = new Map(
    technicians.map((technician) => [technician.id, technician.name]),
  );
  const overloadedTechnicians = access.canViewTechnicianRoster
    ? getOverloadedTechnicianIds(todayJobs).map((technicianId) => ({
        id: technicianId,
        name: technicianNameById.get(technicianId) ?? "Technician",
      }))
    : [];

  const invoiceSummary = access.canViewBilling
    ? getInvoiceSummary(invoices)
    : { unpaidTotal: 0, overdueTotal: 0 };

  const unpaidInvoices = access.canViewBilling
    ? invoices.filter(hasInvoiceUnpaidBalance)
    : [];

  const overdueInvoices = unpaidInvoices.filter(
    (invoice) => invoice.status === "overdue",
  );

  const acceptedEstimatesScheduling = access.canViewBilling
    ? await buildAcceptedEstimatesNeedingSchedulingSnapshot(companyId, estimates)
    : {
        snapshot: EMPTY_ACCEPTED_ESTIMATES_SCHEDULING,
        estimates: [],
      };
  const acceptedEstimatesNeedingScheduling =
    acceptedEstimatesScheduling.snapshot;

  const approvedEstimates = access.canViewBilling
    ? acceptedEstimatesScheduling.estimates.slice(0, APPROVED_ESTIMATES_LIMIT)
    : [];

  const unsentInvoices = access.canViewBilling
    ? invoices.filter((invoice) => invoice.status === "draft")
    : [];

  const unsentEstimates = access.canViewBilling
    ? estimates.filter((estimate) => estimate.status === "draft")
    : [];

  const staleSentEstimateEntries = access.canViewBilling
    ? buildStaleSentEstimateEntries(estimates)
    : [];

  const unpaidInvoiceFollowUpEntries = access.canViewBilling
    ? buildUnpaidInvoiceFollowUpEntries(invoices)
    : [];

  const submittedExpenses = access.canViewCompanyExpenses
    ? expenses.filter((expense) => expense.status === "submitted")
    : [];

  const recentReceipts = access.canViewCompanyExpenses
    ? [...expenses]
        .filter((expense) => expense.receiptStatus === "attached")
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        )
        .slice(0, RECENT_RECEIPTS_LIMIT)
    : [];

  const { sections: summarySections } = operationsSummary;

  // The ten dashboard numbers that are a count or a sum over the WHOLE tenant.
  //
  // Derived here from the arrays this function already loaded — which is the
  // defect: PostgREST caps those arrays at 1000 rows, so on a large tenant these
  // are computed from a fraction of the data and understate by roughly 90%.
  // selectDashboardAggregates decides whether that stays authoritative, whether
  // the SQL aggregates are compared against it, or whether they replace it.
  const legacyAggregateFields = {
    unpaidCount: unpaidInvoices.length,
    unpaidTotal: invoiceSummary.unpaidTotal,
    overdueCount: overdueInvoices.length,
    overdueTotal: invoiceSummary.overdueTotal,
    unpaidInvoiceFollowUpCount: unpaidInvoiceFollowUpEntries.length,
    unsentInvoiceCount: unsentInvoices.length,
    unsentEstimateCount: unsentEstimates.length,
    staleSentEstimateCount: staleSentEstimateEntries.length,
    expenseSubmittedCount: summarySections.pendingExpenses.count,
    expenseSubmittedTotal: summarySections.pendingExpenses.totalAmount,
  };

  const aggregateSelection = access.canViewBilling
    ? await selectDashboardAggregates({
        companyId,
        legacy: legacyAggregateFields,
        reference: new Date(),
      })
    : { fields: legacyAggregateFields, source: "legacy" as const, drift: [] };

  const totals = aggregateSelection.fields;

  return {
    access,
    analytics: access.canViewOperationalReports
      ? {
          todayCollectedRevenue: summarySections.revenue.todayCollectedRevenue,
          todayPaymentCount: summarySections.revenue.todayPaymentCount,
          openJobs: summarySections.openJobs.count,
          pendingExpenseCount: summarySections.pendingExpenses.count,
          activeLaborEntries:
            summarySections.activeTechnicians.activeLaborEntries,
          reviewIssuesResolvedThisWeek:
            summarySections.completedWorkReview.resolvedThisWeek,
        }
      : {
          todayCollectedRevenue: 0,
          todayPaymentCount: 0,
          openJobs: todayJobs.filter(
            (job) =>
              job.status !== "completed" && job.status !== "cancelled",
          ).length,
          pendingExpenseCount: 0,
          activeLaborEntries: 0,
          reviewIssuesResolvedThisWeek: 0,
        },
    operations: {
      ...todayOperationsSummary,
      overloadedTechnicianCount: overloadedTechnicians.length,
      overloadedTechnicians,
      todayJobs: todayJobs.slice(0, TODAY_JOBS_LIMIT),
      unassignedJobs,
    },
    technicians: access.canViewTechnicianRoster
      ? buildTechnicianStatuses(technicians, activeTimeEntries)
      : [],
    assignableTechnicians: access.canViewTechnicianRoster
      ? technicians.filter(
          (technician) => technician.role === COMPANY_ROLE_LABELS.technician,
        )
      : [],
    money: access.canViewBilling
      ? {
          unpaidCount: totals.unpaidCount,
          unpaidTotal: totals.unpaidTotal,
          overdueCount: totals.overdueCount,
          overdueTotal: totals.overdueTotal,
          paymentsTodayCount: summarySections.revenue.todayPaymentCount,
          paymentsTodayTotal: summarySections.revenue.todayCollectedRevenue,
          paymentsYesterdayTotal: paymentsYesterday.total,
          paymentsThisWeekTotal: paymentsThisWeek.total,
          paymentsThisMonthTotal: paymentsThisMonth.total,
          paymentsLast7Days: paymentsLast7Days.map((day) => ({
            paymentDate: day.paymentDate,
            total: day.total,
          })),
          recentPayments: recentPayments.map((payment) => ({
            id: payment.id,
            invoiceId: payment.invoiceId,
            invoiceNumber: payment.invoiceNumber,
            customerName: payment.customerName,
            amount: payment.amount,
            paymentDate: payment.paymentDate,
            createdAt: payment.createdAt,
          })),
          approvedEstimates,
          overdueInvoices: overdueInvoices
            .slice(0, OVERDUE_INVOICES_DASHBOARD_LIMIT)
            .map((invoice) => ({
              id: invoice.id,
              invoiceNumber: invoice.invoiceNumber,
              customerName: invoice.customerName,
              customerEmail: invoice.customerEmail,
              balanceDue: invoice.balanceDue,
              dueDate: invoice.dueDate,
              status: invoice.status,
            })),
          unpaidInvoiceFollowUpCount: totals.unpaidInvoiceFollowUpCount,
          unpaidInvoicesNeedingFollowUp: unpaidInvoiceFollowUpEntries
            .slice(0, UNPAID_INVOICE_FOLLOW_UP_DASHBOARD_LIMIT)
            .map((entry) => ({
              id: entry.invoiceId,
              invoiceNumber: entry.invoiceNumber,
              customerName: entry.customerName,
              customerEmail: entry.customerEmail,
              balanceDue: entry.balanceDue,
              sentAt: entry.sentAt,
              issueDate: entry.issueDate,
              daysUnpaid: entry.daysUnpaid,
              status: entry.status,
            })),
          unpaidInvoiceFollowUpThresholdDays:
            UNPAID_INVOICE_FOLLOW_UP_THRESHOLD_DAYS,
          unsentInvoiceCount: totals.unsentInvoiceCount,
          unsentInvoices: unsentInvoices
            .slice(0, UNSENT_INVOICES_DASHBOARD_LIMIT)
            .map((invoice) => ({
              id: invoice.id,
              invoiceNumber: invoice.invoiceNumber,
              customerName: invoice.customerName,
              customerEmail: invoice.customerEmail,
              jobId: invoice.jobId,
              total: invoice.total,
              status: invoice.status,
            })),
          unsentEstimateCount: totals.unsentEstimateCount,
          unsentEstimates: unsentEstimates
            .slice(0, UNSENT_ESTIMATES_DASHBOARD_LIMIT)
            .map((estimate) => ({
              id: estimate.id,
              estimateNumber: estimate.estimateNumber,
              customerName: estimate.customerName,
              customerEmail: estimate.customerEmail,
              jobId: estimate.jobId,
              total: estimate.total,
              status: estimate.status,
            })),
          staleSentEstimateCount: totals.staleSentEstimateCount,
          staleSentEstimates: staleSentEstimateEntries
            .slice(0, STALE_SENT_ESTIMATES_DASHBOARD_LIMIT)
            .map((entry) => ({
              id: entry.estimateId,
              estimateNumber: entry.estimateNumber,
              customerName: entry.customerName,
              customerEmail: entry.customerEmail,
              jobId: entry.jobId,
              total: entry.total,
              status: entry.status,
              sentAt: entry.sentAt,
              daysSinceSent: entry.daysSinceSent,
            })),
          staleSentEstimateThresholdDays: ESTIMATE_RECOVERY_THRESHOLD_DAYS,
        }
      : EMPTY_MONEY,
    expenses: access.canViewCompanyExpenses
      ? {
          submittedCount: totals.expenseSubmittedCount,
          submittedTotal: totals.expenseSubmittedTotal,
          rejectedCount: expenses.filter(
            (expense) => expense.status === "rejected",
          ).length,
          recentReceipts,
          pendingExpenses: submittedExpenses.slice(0, PENDING_EXPENSES_LIMIT),
        }
      : EMPTY_EXPENSES,
    notifications: {
      unreadCount,
      recent: notifications.slice(0, RECENT_NOTIFICATIONS_LIMIT),
    },
    officeReviewQueue: officeReviewQueueReport,
    stalledJobs: access.canViewOperationalReports
      ? {
          stalledCount: summarySections.stalledJobs.count,
          inactivityThresholdDays:
            summarySections.stalledJobs.inactivityThresholdDays,
          stalledJobs: summarySections.stalledJobs.stalledJobs.slice(
            0,
            STALLED_JOBS_DASHBOARD_LIMIT,
          ),
        }
      : {
          stalledCount: 0,
          inactivityThresholdDays: 0,
          stalledJobs: [],
        },
    completedWorkAwaitingInvoicing: access.canViewOperationalReports
      ? {
          count: summarySections.completedAwaitingInvoicing.count,
          jobs: summarySections.completedAwaitingInvoicing.jobs.slice(
            0,
            COMPLETED_WORK_DASHBOARD_LIMIT,
          ),
        }
      : { count: 0, jobs: [] },
    completedWorkReview: access.canViewOperationalReports
      ? {
          count: summarySections.completedWorkReview.count,
          jobs: summarySections.completedWorkReview.jobs.slice(
            0,
            COMPLETED_WORK_REVIEW_DASHBOARD_LIMIT,
          ),
          resolvedThisWeek: summarySections.completedWorkReview.resolvedThisWeek,
        }
      : { count: 0, jobs: [], resolvedThisWeek: 0 },
    acceptedEstimatesNeedingScheduling,
    newLeadsNeedingContact: access.canManageCustomers
      ? {
          count: newLeadsNeedingContactAll.length,
          leads: newLeadsNeedingContactAll
            .slice(0, LEAD_ATTENTION_DASHBOARD_LIMIT)
            .map(buildLeadDashboardAttentionPreview),
        }
      : EMPTY_LEAD_ATTENTION,
    leadsNeedingContactQueue: access.canManageCustomers
      ? {
          count: leadsNeedingContactQueueAll.length,
          leads: leadsNeedingContactQueueAll
            .slice(0, LEAD_ATTENTION_DASHBOARD_LIMIT)
            .map(buildLeadDashboardAttentionPreview),
        }
      : EMPTY_LEAD_ATTENTION,
    leadsReadyForEstimate: access.canManageCustomers
      ? {
          count: leadsReadyForEstimateAll.length,
          leads: leadsReadyForEstimateAll
            .slice(0, LEAD_ATTENTION_DASHBOARD_LIMIT)
            .map(buildLeadDashboardAttentionPreview),
        }
      : EMPTY_LEAD_ATTENTION,
    customersNeedingInfo: access.canManageCustomers
      ? {
          count: customersNeedingInfoAll.length,
          customers: customersNeedingInfoAll
            .slice(0, CUSTOMERS_NEEDING_INFO_DASHBOARD_LIMIT)
            .map((customer) => ({
              id: customer.id,
              name: customer.name,
            })),
        }
      : EMPTY_CUSTOMERS_NEEDING_INFO,
    staleOpenShifts: canViewTimeEntries
      ? {
          count: staleOpenShiftsAll.length,
          shifts: staleOpenShiftsAll.slice(0, STALE_OPEN_SHIFTS_DASHBOARD_LIMIT),
        }
      : EMPTY_STALE_OPEN_SHIFTS,
    paymentAttention: access.canViewBilling
      ? {
          cardFailureCount,
          openDisputeCount,
          cardFailures: cardFailureAttempts
            .slice(0, PAYMENT_ATTENTION_DASHBOARD_LIMIT)
            .map((attempt) => ({
              id: attempt.id,
              invoiceId: attempt.invoice_id,
              invoiceNumber: attempt.invoiceNumber,
              amount: attempt.amount,
              lastCardFailureAt: attempt.last_card_failure_at,
            })),
          openDisputes: openDisputesAll
            .slice(0, PAYMENT_ATTENTION_DASHBOARD_LIMIT)
            .map((dispute) => ({
              id: dispute.id,
              amount: dispute.amount,
              status: dispute.status,
              reason: dispute.reason,
              invoiceId: dispute.invoice_id,
              invoiceNumber: dispute.invoiceNumber,
            })),
        }
      : EMPTY_PAYMENT_ATTENTION,
    leadFollowUp: access.canManageCustomers
      ? {
          count: leadPipelineMetrics.followUpsDue,
          leads: leadFollowUpLeads.map((lead) => ({
            id: lead.id,
            firstName: lead.firstName,
            lastName: lead.lastName,
            companyName: lead.companyName,
            phone: lead.phone,
            email: lead.email,
            nextFollowUpAt: lead.nextFollowUpAt ?? "",
            status: lead.status,
          })),
        }
      : EMPTY_LEAD_FOLLOW_UP,
    leadPipelineSummary: access.canManageCustomers
      ? {
          totalLeads: leadPipelineMetrics.totalLeads,
          followUpsDue: leadPipelineMetrics.followUpsDue,
          wonLeads: leadPipelineMetrics.wonLeads,
          lostLeads: leadPipelineMetrics.lostLeads,
          hasLeads: hasActiveLeads,
          newLeadsToday,
        }
      : EMPTY_LEAD_PIPELINE_SUMMARY,
    workflowReminders: access.canViewBilling
      ? {
          totalActiveCount: workflowRemindersLoad.totalActiveCount,
          visibleCount: workflowRemindersLoad.reminders.length,
          reminders: workflowRemindersLoad.reminders.map((reminder) =>
            buildDashboardWorkflowReminderPreview({
              id: reminder.id,
              title: reminder.title,
              message: reminder.message,
              triggeredAt: reminder.triggered_at,
              reminderKind: reminder.reminder_kind,
              sourceEntityType: reminder.source_entity_type,
              sourceEntityId: reminder.source_entity_id,
            }),
          ),
        }
      : EMPTY_WORKFLOW_REMINDERS,
    operationalInsights: access.canViewOperationalReports
      ? filterDailyOperationsSummaryForBillingAccess(
          operationsSummary,
          access.canViewBilling,
        )
      : EMPTY_OPERATIONAL_INSIGHTS,
    operationalHealth: access.canViewOperationalReports
      ? buildOperationalHealthReportFromOfficeQueue(officeReviewQueueReport, {
          jobsWithWarnings:
            summarySections.profitabilityWarnings.jobsWithWarnings,
          materialCostExceedsCollectedCount:
            summarySections.profitabilityWarnings
              .materialCostExceedsCollectedCount,
        })
      : EMPTY_OPERATIONAL_HEALTH,
    recentActivity,
  };
}
