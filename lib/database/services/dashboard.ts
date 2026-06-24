import {
  getCompanyAccessScope,
  type CompanyAccessScope,
} from "@/lib/database/access-control";
import type { ActiveCompanyContext } from "@/lib/database/types/core-tables";
import { COMPANY_ROLE_LABELS } from "@/lib/database/types/roles";
import { listDispatchJobsForToday } from "@/lib/database/queries/dispatch";
import { listLeads } from "@/lib/database/queries/leads";
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
import { listRecentPayments } from "@/lib/database/queries/invoice-payments";
import {
  getUnreadNotificationCount,
  getUserNotifications,
} from "@/lib/database/queries/notifications";
import { listTechnicians } from "@/lib/database/queries/technicians";
import {
  listActiveTechnicianTimeEntries,
  mapEntryTypeToTimeState,
} from "@/lib/database/queries/time-entries";
import { getDailyOperationsSummary } from "@/lib/database/services/operations/daily-operations-summary";
import { getCompanyOfficeReviewQueueReport } from "@/lib/database/services/reports/office-review-queue";
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

const EMPTY_LEAD_PIPELINE_SUMMARY: DashboardData["leadPipelineSummary"] = {
  totalLeads: 0,
  followUpsDue: 0,
  wonLeads: 0,
  lostLeads: 0,
  hasLeads: false,
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

  const [
    technicians,
    activeTimeEntries,
    invoices,
    estimates,
    expenses,
    recentPayments,
    recentActivity,
    notifications,
    unreadCount,
    operationsSummary,
    officeReviewQueueReport,
    leads,
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
  const leadsReadyForEstimateAll = access.canManageCustomers
    ? selectLeadsReadyForEstimatePreparation(leads, {
        timeZone: context.company.timezone,
      })
    : [];
  const hasActiveLeads = access.canManageCustomers
    ? leads.some((lead) => !lead.deletedAt && !lead.archivedAt)
    : false;

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
          unpaidCount: unpaidInvoices.length,
          unpaidTotal: invoiceSummary.unpaidTotal,
          overdueCount: overdueInvoices.length,
          overdueTotal: invoiceSummary.overdueTotal,
          paymentsTodayCount: summarySections.revenue.todayPaymentCount,
          paymentsTodayTotal: summarySections.revenue.todayCollectedRevenue,
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
          unpaidInvoiceFollowUpCount: unpaidInvoiceFollowUpEntries.length,
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
          unsentInvoiceCount: unsentInvoices.length,
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
          unsentEstimateCount: unsentEstimates.length,
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
          staleSentEstimateCount: staleSentEstimateEntries.length,
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
          submittedCount: summarySections.pendingExpenses.count,
          submittedTotal: summarySections.pendingExpenses.totalAmount,
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
    leadsReadyForEstimate: access.canManageCustomers
      ? {
          count: leadsReadyForEstimateAll.length,
          leads: leadsReadyForEstimateAll
            .slice(0, LEAD_ATTENTION_DASHBOARD_LIMIT)
            .map(buildLeadDashboardAttentionPreview),
        }
      : EMPTY_LEAD_ATTENTION,
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
        }
      : EMPTY_LEAD_PIPELINE_SUMMARY,
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
