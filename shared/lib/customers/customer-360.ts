import { listCustomerEquipment } from "@/lib/database/queries/customer-equipment";
import { listEstimatesByCustomer } from "@/lib/database/queries/estimates";
import { listInvoicePaymentsForCustomer } from "@/lib/database/queries/invoice-payments";
import { listInvoicesByCustomer } from "@/lib/database/queries/invoices";
import { listJobsByCustomer } from "@/lib/database/queries/jobs";
import { getEstimateLifecycleState } from "@/shared/lib/estimate-lifecycle";
import { getEstimateWorkflowGroup } from "@/shared/lib/estimate-workflow-list";
import { sumCollectedRevenue } from "@/shared/lib/reports/report-metrics";
import { formatCurrency } from "@/shared/types/customer";
import { computeCustomerFinancialSummary } from "@/shared/types/customer-financial";
import type { CustomerEquipment } from "@/shared/types/customer-equipment";
import type { Estimate } from "@/shared/types/estimate";
import {
  hasInvoiceUnpaidBalance,
  isActiveInvoice,
  roundCurrency,
  type Invoice,
} from "@/shared/types/invoice";
import type { InvoicePayment } from "@/shared/types/invoice-payment";
import type { Job } from "@/shared/types/job";

export const CUSTOMER_360_RECORD_LIMIT = 500;

const CUSTOMER_360_TRUNCATION_MESSAGE =
  "Some metrics may be incomplete for customers with more than 500 jobs, estimates, or invoices.";

export type Customer360HealthStatus =
  | "healthy"
  | "attention_needed"
  | "opportunity"
  | "at_risk";

export type Customer360OpportunityType =
  | "open_estimate_follow_up"
  | "inactive_customer"
  | "maintenance_opportunity"
  | "repeat_repair_opportunity"
  | "outstanding_balance";

export type Customer360OpportunitySeverity = "info" | "warning" | "critical";

export type Customer360Opportunity = {
  type: Customer360OpportunityType;
  title: string;
  description: string;
  severity: Customer360OpportunitySeverity;
  href?: string;
};

export type Customer360Snapshot = {
  summary: {
    lifetimeRevenue: number;
    lastCompletedJob: Job | null;
    openEstimateCount: number;
    openEstimateTotal: number;
    outstandingBalance: number;
    equipmentCount: number;
  };
  health: {
    status: Customer360HealthStatus;
    reasons: string[];
  };
  opportunities: Customer360Opportunity[];
  limitations: string[];
};

type Customer360Input = {
  jobs: Job[];
  estimates: Estimate[];
  invoices: Invoice[];
  equipment: CustomerEquipment[];
  payments: InvoicePayment[];
};

const OPPORTUNITY_SEVERITY_RANK: Record<
  Customer360OpportunitySeverity,
  number
> = {
  critical: 0,
  warning: 1,
  info: 2,
};

function normalizeMoney(value: number | null | undefined): number {
  return Number.isFinite(value) ? value! : 0;
}

function parseDateOnly(value: string): Date | null {
  const datePart = value.split("T")[0] ?? value;
  const [year, month, day] = datePart.split("-").map(Number);

  if (!year || !month || !day) {
    return null;
  }

  const parsed = new Date(year, month - 1, day);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function daysSinceDate(value: string, reference = new Date()): number {
  const parsed = parseDateOnly(value);
  if (!parsed) {
    return 0;
  }

  const today = parseDateOnly(
    `${reference.getFullYear()}-${String(reference.getMonth() + 1).padStart(2, "0")}-${String(reference.getDate()).padStart(2, "0")}`,
  );

  if (!today) {
    return 0;
  }

  return Math.max(
    0,
    Math.floor((today.getTime() - parsed.getTime()) / (1000 * 60 * 60 * 24)),
  );
}

function resolveJobCompletionDate(job: Job): string | null {
  if (job.status !== "completed") {
    return null;
  }

  return job.completedAt ?? job.scheduledDate ?? null;
}

function getCompletedJobs(jobs: Job[]): Job[] {
  return jobs
    .filter((job) => job.status === "completed")
    .sort((left, right) => {
      const leftDate = resolveJobCompletionDate(left);
      const rightDate = resolveJobCompletionDate(right);

      if (!leftDate && !rightDate) {
        return 0;
      }
      if (!leftDate) {
        return 1;
      }
      if (!rightDate) {
        return -1;
      }

      return rightDate.localeCompare(leftDate);
    });
}

function daysSinceLastCompletedJob(jobs: Job[], reference = new Date()): number | null {
  const lastCompleted = getCompletedJobs(jobs)[0];
  const completionDate = lastCompleted
    ? resolveJobCompletionDate(lastCompleted)
    : null;

  if (!completionDate) {
    return null;
  }

  return daysSinceDate(completionDate, reference);
}

function isActiveEstimateRecord(estimate: Estimate): boolean {
  return getEstimateLifecycleState(estimate) === "active";
}

function isOpenEstimate(estimate: Estimate): boolean {
  if (!isActiveEstimateRecord(estimate)) {
    return false;
  }

  if (["approved", "declined", "converted", "cancelled"].includes(estimate.status)) {
    return false;
  }

  return (
    getEstimateWorkflowGroup(estimate.status) === "needs_action" ||
    estimate.status === "draft" ||
    estimate.status === "sent"
  );
}

function resolveEstimateAgeDate(estimate: Estimate): string {
  return estimate.sentAt ?? estimate.createdAt;
}

function isRepairOrServiceJob(job: Job): boolean {
  const jobType = job.jobType.trim().toLowerCase();
  if (!jobType) {
    return false;
  }

  return /repair|service|maintenance|diagnostic|tune-?up|fix/.test(jobType);
}

function hasOverdueOutstandingBalance(invoices: Invoice[]): boolean {
  return invoices.some(
    (invoice) =>
      isActiveInvoice(invoice) &&
      invoice.status === "overdue" &&
      invoice.balanceDue > 0,
  );
}

function hasOutstandingBalance(invoices: Invoice[]): boolean {
  return invoices.some(
    (invoice) => isActiveInvoice(invoice) && invoice.balanceDue > 0,
  );
}

function countRepairServiceJobsInLastYear(
  jobs: Job[],
  reference = new Date(),
): number {
  const cutoff = new Date(reference);
  cutoff.setDate(cutoff.getDate() - 365);

  return jobs.filter((job) => {
    if (job.status !== "completed" || !isRepairOrServiceJob(job)) {
      return false;
    }

    const completionDate = resolveJobCompletionDate(job);
    if (!completionDate) {
      return false;
    }

    const parsed = parseDateOnly(completionDate);
    return parsed != null && parsed >= cutoff;
  }).length;
}

function resolveHealthStatus(input: {
  lifetimeRevenue: number;
  daysSinceLastCompleted: number | null;
  hasOverdueBalance: boolean;
  hasOutstandingBalance: boolean;
  hasStaleOpenEstimate: boolean;
  hasOpenEstimate: boolean;
  hasEquipmentServiceGap: boolean;
  hasRepeatRepairPattern: boolean;
  isInactiveCustomer: boolean;
}): { status: Customer360HealthStatus; reasons: string[] } {
  const reasons: string[] = [];

  const isAtRisk =
    input.hasOverdueBalance ||
    (input.lifetimeRevenue > 0 &&
      (input.daysSinceLastCompleted == null || input.daysSinceLastCompleted >= 365));

  if (isAtRisk) {
    if (input.hasOverdueBalance) {
      reasons.push("Overdue invoice balance");
    }
    if (
      input.lifetimeRevenue > 0 &&
      (input.daysSinceLastCompleted == null || input.daysSinceLastCompleted >= 365)
    ) {
      reasons.push("No completed work in 12+ months despite prior revenue");
    }

    return { status: "at_risk", reasons };
  }

  const needsAttention =
    input.hasOutstandingBalance || input.hasStaleOpenEstimate;

  if (needsAttention) {
    if (input.hasOutstandingBalance) {
      reasons.push("Outstanding invoice balance");
    }
    if (input.hasStaleOpenEstimate) {
      reasons.push("Open estimate waiting 7+ days");
    }

    return { status: "attention_needed", reasons };
  }

  const hasOpportunity =
    input.hasOpenEstimate ||
    input.hasEquipmentServiceGap ||
    input.hasRepeatRepairPattern ||
    input.isInactiveCustomer;

  if (hasOpportunity) {
    if (input.hasOpenEstimate) {
      reasons.push("Open estimate ready for follow-up");
    }
    if (input.hasEquipmentServiceGap) {
      reasons.push("Equipment on file without recent service");
    }
    if (input.hasRepeatRepairPattern) {
      reasons.push("Repeat repair pattern in the last year");
    }
    if (input.isInactiveCustomer) {
      reasons.push("No completed work in 6+ months");
    }

    return { status: "opportunity", reasons };
  }

  return { status: "healthy", reasons: ["No active risks or follow-ups"] };
}

function buildOpportunities(input: {
  openEstimates: Estimate[];
  daysSinceLastCompleted: number | null;
  activeEquipmentCount: number;
  repairServiceJobCountLastYear: number;
  unpaidInvoices: Invoice[];
  healthStatus: Customer360HealthStatus;
}): Customer360Opportunity[] {
  const opportunities: Customer360Opportunity[] = [];

  if (input.unpaidInvoices.length > 0) {
    const overdueCount = input.unpaidInvoices.filter(
      (invoice) => invoice.status === "overdue",
    ).length;
    const balance = roundCurrency(
      input.unpaidInvoices.reduce(
        (sum, invoice) => sum + normalizeMoney(invoice.balanceDue),
        0,
      ),
    );

    opportunities.push({
      type: "outstanding_balance",
      title: "Collect outstanding balance",
      description:
        overdueCount > 0
          ? `${formatCurrency(balance)} due across ${input.unpaidInvoices.length} invoice${input.unpaidInvoices.length === 1 ? "" : "s"} (${overdueCount} overdue).`
          : `${formatCurrency(balance)} due across ${input.unpaidInvoices.length} open invoice${input.unpaidInvoices.length === 1 ? "" : "s"}.`,
      severity: overdueCount > 0 ? "critical" : "warning",
      href: `/invoices/${input.unpaidInvoices[0]!.id}`,
    });
  }

  if (input.openEstimates.length > 0) {
    const sorted = [...input.openEstimates].sort((left, right) =>
      resolveEstimateAgeDate(left).localeCompare(resolveEstimateAgeDate(right)),
    );
    const oldest = sorted[0]!;
    const total = roundCurrency(
      input.openEstimates.reduce(
        (sum, estimate) => sum + normalizeMoney(estimate.total),
        0,
      ),
    );

    opportunities.push({
      type: "open_estimate_follow_up",
      title: "Follow up on open estimate",
      description:
        input.openEstimates.length === 1
          ? `${oldest.estimateNumber} is still awaiting a decision (${formatCurrency(total)}).`
          : `${input.openEstimates.length} estimates are still open (${formatCurrency(total)} total).`,
      severity: "info",
      href: `/estimates/${oldest.id}`,
    });
  }

  if (
    input.daysSinceLastCompleted != null &&
    input.daysSinceLastCompleted >= 180 &&
    input.healthStatus !== "at_risk"
  ) {
    opportunities.push({
      type: "inactive_customer",
      title: "Re-engage inactive customer",
      description: `No completed jobs in ${input.daysSinceLastCompleted} days.`,
      severity: "warning",
    });
  }

  if (
    input.activeEquipmentCount > 0 &&
    (input.daysSinceLastCompleted == null || input.daysSinceLastCompleted >= 180)
  ) {
    opportunities.push({
      type: "maintenance_opportunity",
      title: "Maintenance opportunity",
      description: `${input.activeEquipmentCount} active equipment record${input.activeEquipmentCount === 1 ? "" : "s"} with no recent service.`,
      severity: "info",
    });
  }

  if (input.repairServiceJobCountLastYear >= 2) {
    opportunities.push({
      type: "repeat_repair_opportunity",
      title: "Repeat repair pattern",
      description: `${input.repairServiceJobCountLastYear} repair or service jobs completed in the last 12 months.`,
      severity: "warning",
    });
  }

  return opportunities.sort(
    (left, right) =>
      OPPORTUNITY_SEVERITY_RANK[left.severity] -
      OPPORTUNITY_SEVERITY_RANK[right.severity],
  );
}

function resolveCustomer360Limitations(input: {
  jobs: Job[];
  estimates: Estimate[];
  invoices: Invoice[];
}): string[] {
  const hitLimit =
    input.jobs.length >= CUSTOMER_360_RECORD_LIMIT ||
    input.estimates.length >= CUSTOMER_360_RECORD_LIMIT ||
    input.invoices.length >= CUSTOMER_360_RECORD_LIMIT;

  return hitLimit ? [CUSTOMER_360_TRUNCATION_MESSAGE] : [];
}

export type Customer360PreloadedData = {
  jobs?: Job[];
  estimates?: Estimate[];
  invoices?: Invoice[];
  equipment?: CustomerEquipment[];
};

export function buildCustomer360Snapshot(
  input: Customer360Input,
): Customer360Snapshot {
  const completedJobs = getCompletedJobs(input.jobs);
  const lastCompletedJob = completedJobs[0] ?? null;
  const daysSinceLastCompleted = daysSinceLastCompletedJob(input.jobs);
  const openEstimates = input.estimates.filter(isOpenEstimate);
  const openEstimateTotal = roundCurrency(
    openEstimates.reduce(
      (sum, estimate) => sum + normalizeMoney(estimate.total),
      0,
    ),
  );
  const activeEquipment = input.equipment.filter((item) => item.isActive);
  const financialSummary = computeCustomerFinancialSummary(input.invoices);
  const lifetimeRevenue = sumCollectedRevenue(input.payments);
  const unpaidInvoices = input.invoices
    .filter(hasInvoiceUnpaidBalance)
    .sort((left, right) => right.balanceDue - left.balanceDue);
  const staleOpenEstimate = openEstimates.some(
    (estimate) => daysSinceDate(resolveEstimateAgeDate(estimate)) >= 7,
  );
  const repairServiceJobCountLastYear = countRepairServiceJobsInLastYear(
    input.jobs,
  );

  const health = resolveHealthStatus({
    lifetimeRevenue,
    daysSinceLastCompleted,
    hasOverdueBalance: hasOverdueOutstandingBalance(input.invoices),
    hasOutstandingBalance: hasOutstandingBalance(input.invoices),
    hasStaleOpenEstimate: staleOpenEstimate,
    hasOpenEstimate: openEstimates.length > 0,
    hasEquipmentServiceGap:
      activeEquipment.length > 0 &&
      (daysSinceLastCompleted == null || daysSinceLastCompleted >= 180),
    hasRepeatRepairPattern: repairServiceJobCountLastYear >= 2,
    isInactiveCustomer:
      daysSinceLastCompleted != null && daysSinceLastCompleted >= 180,
  });

  const opportunities = buildOpportunities({
    openEstimates,
    daysSinceLastCompleted,
    activeEquipmentCount: activeEquipment.length,
    repairServiceJobCountLastYear,
    unpaidInvoices,
    healthStatus: health.status,
  });

  return {
    summary: {
      lifetimeRevenue,
      lastCompletedJob,
      openEstimateCount: openEstimates.length,
      openEstimateTotal,
      outstandingBalance: financialSummary.outstandingBalance,
      equipmentCount: activeEquipment.length,
    },
    health,
    opportunities,
    limitations: resolveCustomer360Limitations(input),
  };
}

export async function loadCustomer360Snapshot(
  companyId: string,
  customerId: string,
  preloaded?: Customer360PreloadedData,
): Promise<Customer360Snapshot> {
  const [jobs, estimates, invoices, equipment, payments] = await Promise.all([
    preloaded?.jobs ??
      listJobsByCustomer(companyId, customerId, CUSTOMER_360_RECORD_LIMIT),
    preloaded?.estimates ??
      listEstimatesByCustomer(companyId, customerId, CUSTOMER_360_RECORD_LIMIT),
    preloaded?.invoices ??
      listInvoicesByCustomer(companyId, customerId, CUSTOMER_360_RECORD_LIMIT),
    preloaded?.equipment ??
      listCustomerEquipment(companyId, customerId, { includeInactive: true }),
    listInvoicePaymentsForCustomer(companyId, customerId),
  ]);

  return buildCustomer360Snapshot({
    jobs,
    estimates,
    invoices,
    equipment,
    payments,
  });
}
