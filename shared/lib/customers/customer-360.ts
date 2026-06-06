import { getCustomerById } from "@/lib/database/queries/customers";
import { listCustomerEquipment } from "@/lib/database/queries/customer-equipment";
import { listEstimatesByCustomer } from "@/lib/database/queries/estimates";
import { listInvoicesByCustomer } from "@/lib/database/queries/invoices";
import { listJobsByCustomer } from "@/lib/database/queries/jobs";
import { listOperationalActivitiesForCustomer } from "@/lib/database/queries/operational-activities";
import { getCustomerLifecycleState } from "@/shared/lib/customer-lifecycle";
import {
  resolveJobCompletionDate,
} from "@/shared/lib/customers/customer-operational-stats";
import { getEstimateLifecycleState } from "@/shared/lib/estimate-lifecycle";
import { getEstimateWorkflowGroup } from "@/shared/lib/estimate-workflow-list";
import {
  formatCustomerStatusLabel,
  type Customer,
  type CustomerStatus,
} from "@/shared/types/customer";
import {
  computeCustomerFinancialSummary,
  type CustomerFinancialSummary,
} from "@/shared/types/customer-financial";
import type { CustomerEquipment } from "@/shared/types/customer-equipment";
import {
  getWarrantyStatus,
  type WarrantyStatus,
} from "@/shared/types/customer-equipment";
import type { Estimate } from "@/shared/types/estimate";
import { formatCurrency } from "@/shared/types/customer";
import {
  hasInvoiceUnpaidBalance,
  roundCurrency,
  type Invoice,
} from "@/shared/types/invoice";
import type { Job } from "@/shared/types/job";
import type { OperationalActivity } from "@/shared/types/operational-activity";
import { DISPATCH_PAGE_UNASSIGNED_HREF } from "@/shared/lib/dispatch-page-focus";
import {
  CUSTOMER_DETAIL_BILLING_ANCHOR,
  CUSTOMER_DETAIL_EQUIPMENT_ANCHOR,
} from "@/shared/lib/customers/customer-detail-anchors";

export const CUSTOMER_360_RECORD_LIMIT = 500;
export const CUSTOMER_360_ACTIVITY_LIMIT = 10;
export const CUSTOMER_360_EQUIPMENT_PREVIEW_LIMIT = 5;
export const CUSTOMER_360_NO_RECENT_SERVICE_DAYS = 180;
export const CUSTOMER_360_AGING_EQUIPMENT_YEARS = 10;

const CUSTOMER_360_TRUNCATION_MESSAGE =
  "Only the 500 most recent jobs, estimates, and invoices are included. Financial totals and opportunities may omit older records.";

export type Customer360OpportunityType =
  | "outstanding_balance"
  | "open_or_expired_estimate"
  | "unscheduled_or_open_job"
  | "aging_equipment"
  | "no_recent_service";

export type Customer360OpportunitySeverity = "info" | "warning" | "critical";

export type Customer360Opportunity = {
  type: Customer360OpportunityType;
  title: string;
  description: string;
  severity: Customer360OpportunitySeverity;
  href?: string;
  actionLabel?: string;
};

export type Customer360ActionContext = {
  customerId: string;
  canCreateJob: boolean;
  canAccessDispatch: boolean;
};

export type Customer360IdentitySummary = {
  id: string;
  name: string;
  email: string;
  phone: string;
  company?: string;
  status: CustomerStatus;
  statusLabel: string;
  lifecycleState: ReturnType<typeof getCustomerLifecycleState>;
  addressLine: string;
  tags: string[];
  customerSince: string;
};

export type Customer360FinancialSnapshot = CustomerFinancialSummary;

export type Customer360EquipmentItem = {
  id: string;
  name: string;
  equipmentType?: string;
  installDate?: string;
  warrantyStatus: WarrantyStatus;
};

export type Customer360EquipmentSnapshot = {
  totalCount: number;
  activeCount: number;
  agingCount: number;
  items: Customer360EquipmentItem[];
};

export type Customer360Data = {
  identity: Customer360IdentitySummary;
  financial: Customer360FinancialSnapshot | null;
  equipment: Customer360EquipmentSnapshot;
  opportunities: Customer360Opportunity[];
  recentActivity: OperationalActivity[];
  limitations: string[];
};

type Customer360BuildInput = {
  customer: Customer;
  jobs: Job[];
  estimates: Estimate[];
  invoices: Invoice[];
  equipment: CustomerEquipment[];
  activities: OperationalActivity[];
  includeBilling: boolean;
  actionContext: Customer360ActionContext;
};

export type Customer360PreloadedData = {
  customer?: Customer;
  jobs?: Job[];
  estimates?: Estimate[];
  invoices?: Invoice[];
  equipment?: CustomerEquipment[];
  activities?: OperationalActivity[];
  includeBilling?: boolean;
  actionContext?: Customer360ActionContext;
};

const OPPORTUNITY_TYPE_ORDER: Customer360OpportunityType[] = [
  "outstanding_balance",
  "open_or_expired_estimate",
  "unscheduled_or_open_job",
  "aging_equipment",
  "no_recent_service",
];

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

function daysSinceLastCompletedJob(
  jobs: Job[],
  reference = new Date(),
): number | null {
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

  return getEstimateWorkflowGroup(estimate.status) === "needs_action";
}

function isExpiredByValidUntil(
  estimate: Estimate,
  reference = new Date(),
): boolean {
  if (!estimate.validUntil?.trim()) {
    return false;
  }

  const validUntil = parseDateOnly(estimate.validUntil);
  if (!validUntil) {
    return false;
  }

  const today = parseDateOnly(
    `${reference.getFullYear()}-${String(reference.getMonth() + 1).padStart(2, "0")}-${String(reference.getDate()).padStart(2, "0")}`,
  );

  if (!today) {
    return false;
  }

  return validUntil < today;
}

function isExpiredEstimate(estimate: Estimate): boolean {
  return isOpenEstimate(estimate) && isExpiredByValidUntil(estimate);
}

function resolveEstimateAgeDate(estimate: Estimate): string {
  return estimate.sentAt ?? estimate.createdAt;
}

function isOpenJob(job: Job): boolean {
  return job.status !== "completed" && job.status !== "cancelled";
}

function resolveEquipmentWarrantyStatus(
  warrantyExpiresAt: string | undefined,
): WarrantyStatus {
  if (!warrantyExpiresAt?.trim()) {
    return "none";
  }

  if (!parseDateOnly(warrantyExpiresAt)) {
    return "none";
  }

  return getWarrantyStatus(warrantyExpiresAt);
}

function compareOpenJobs(left: Job, right: Job): number {
  const leftUnassigned = left.assignedTechnicianId ? 1 : 0;
  const rightUnassigned = right.assignedTechnicianId ? 1 : 0;

  if (leftUnassigned !== rightUnassigned) {
    return leftUnassigned - rightUnassigned;
  }

  return (right.scheduledDate ?? "").localeCompare(left.scheduledDate ?? "");
}

function isAgingEquipmentItem(
  item: CustomerEquipment,
  reference = new Date(),
): boolean {
  if (!item.isActive) {
    return false;
  }

  const warrantyStatus = resolveEquipmentWarrantyStatus(item.warrantyExpiresAt);
  if (warrantyStatus === "expired") {
    return true;
  }

  if (!item.installDate) {
    return false;
  }

  const installDate = parseDateOnly(item.installDate);
  if (!installDate) {
    return false;
  }

  const cutoff = new Date(reference);
  cutoff.setFullYear(cutoff.getFullYear() - CUSTOMER_360_AGING_EQUIPMENT_YEARS);
  return installDate <= cutoff;
}

function buildIdentitySummary(customer: Customer): Customer360IdentitySummary {
  return {
    id: customer.id,
    name: customer.name,
    email: customer.email,
    phone: customer.phone,
    company: customer.company,
    status: customer.status,
    statusLabel: formatCustomerStatusLabel(customer.status),
    lifecycleState: getCustomerLifecycleState(customer),
    addressLine: `${customer.address}, ${customer.city}, ${customer.state} ${customer.zip}`,
    tags: customer.tags,
    customerSince: customer.createdAt,
  };
}

function buildEquipmentSnapshot(
  equipment: CustomerEquipment[],
): Customer360EquipmentSnapshot {
  const activeEquipment = equipment.filter((item) => item.isActive);
  const agingEquipment = activeEquipment.filter((item) =>
    isAgingEquipmentItem(item),
  );
  const previewItems = activeEquipment
    .slice(0, CUSTOMER_360_EQUIPMENT_PREVIEW_LIMIT)
    .map(
      (item): Customer360EquipmentItem => ({
        id: item.id,
        name: item.name,
        equipmentType: item.equipmentType,
        installDate: item.installDate,
        warrantyStatus: resolveEquipmentWarrantyStatus(item.warrantyExpiresAt),
      }),
    );

  return {
    totalCount: equipment.length,
    activeCount: activeEquipment.length,
    agingCount: agingEquipment.length,
    items: previewItems,
  };
}

function customerDetailSectionHref(
  customerId: string,
  anchor: string,
): string {
  return `/customers/${customerId}#${anchor}`;
}

function createJobForCustomerHref(customerId: string): string {
  return `/jobs?customerId=${encodeURIComponent(customerId)}&create=1`;
}

function buildOpportunities(input: {
  actionContext: Customer360ActionContext;
  includeBilling: boolean;
  openEstimates: Estimate[];
  expiredEstimates: Estimate[];
  openJobs: Job[];
  agingEquipmentCount: number;
  daysSinceLastCompleted: number | null;
  unpaidInvoices: Invoice[];
}): Customer360Opportunity[] {
  const { customerId, canCreateJob, canAccessDispatch } = input.actionContext;
  const opportunities: Customer360Opportunity[] = [];

  if (input.includeBilling && input.unpaidInvoices.length > 0) {
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
      title: "Outstanding balance",
      description:
        overdueCount > 0
          ? `${formatCurrency(balance)} due across ${input.unpaidInvoices.length} invoice${input.unpaidInvoices.length === 1 ? "" : "s"} (${overdueCount} overdue).`
          : `${formatCurrency(balance)} due across ${input.unpaidInvoices.length} open invoice${input.unpaidInvoices.length === 1 ? "" : "s"}.`,
      severity: overdueCount > 0 ? "critical" : "warning",
      href: customerDetailSectionHref(
        customerId,
        CUSTOMER_DETAIL_BILLING_ANCHOR,
      ),
      actionLabel: "View billing",
    });
  }

  if (input.includeBilling) {
    const expiredEstimates = input.expiredEstimates;
    const openEstimates = input.openEstimates.filter(
      (estimate) => !isExpiredByValidUntil(estimate),
    );
    const estimateSignals = [...openEstimates, ...expiredEstimates];
    if (estimateSignals.length > 0) {
      const sorted = [...estimateSignals].sort((left, right) =>
        resolveEstimateAgeDate(left).localeCompare(resolveEstimateAgeDate(right)),
      );
      const primary = sorted[0]!;
      const openCount = openEstimates.length;
      const expiredCount = expiredEstimates.length;
      const total = roundCurrency(
        estimateSignals.reduce(
          (sum, estimate) => sum + normalizeMoney(estimate.total),
          0,
        ),
      );

      let description = "";
      if (openCount > 0 && expiredCount > 0) {
        description = `${openCount} open and ${expiredCount} expired estimate${expiredCount === 1 ? "" : "s"} (${formatCurrency(total)} total).`;
      } else if (expiredCount > 0) {
        description =
          expiredCount === 1
            ? `${primary.estimateNumber} expired (${formatCurrency(total)}).`
            : `${expiredCount} expired estimates (${formatCurrency(total)} total).`;
      } else {
        description =
          openCount === 1
            ? `${primary.estimateNumber} is awaiting a decision (${formatCurrency(total)}).`
            : `${openCount} estimates are still open (${formatCurrency(total)} total).`;
      }

      opportunities.push({
        type: "open_or_expired_estimate",
        title: "Open or expired estimate",
        description,
        severity: expiredCount > 0 ? "warning" : "info",
        href: `/estimates/${primary.id}`,
        actionLabel: "View estimate",
      });
    }
  }

  if (input.openJobs.length > 0) {
    const unassignedCount = input.openJobs.filter(
      (job) => !job.assignedTechnicianId,
    ).length;
    const primary = input.openJobs[0]!;

    const primaryUnassigned = !primary.assignedTechnicianId;
    const useDispatchLink = primaryUnassigned && canAccessDispatch;

    opportunities.push({
      type: "unscheduled_or_open_job",
      title: "Unscheduled or open job",
      description:
        unassignedCount > 0
          ? `${input.openJobs.length} open job${input.openJobs.length === 1 ? "" : "s"} (${unassignedCount} unassigned).`
          : `${input.openJobs.length} open job${input.openJobs.length === 1 ? "" : "s"} in progress or awaiting completion.`,
      severity: unassignedCount > 0 ? "warning" : "info",
      href: useDispatchLink
        ? DISPATCH_PAGE_UNASSIGNED_HREF
        : `/jobs/${primary.id}`,
      actionLabel: useDispatchLink ? "Open dispatch" : "View job",
    });
  }

  if (input.agingEquipmentCount > 0) {
    opportunities.push({
      type: "aging_equipment",
      title: "Aging equipment",
      description: `${input.agingEquipmentCount} active equipment record${input.agingEquipmentCount === 1 ? "" : "s"} with expired warranty or ${CUSTOMER_360_AGING_EQUIPMENT_YEARS}+ year install age.`,
      severity: "info",
      href: customerDetailSectionHref(
        customerId,
        CUSTOMER_DETAIL_EQUIPMENT_ANCHOR,
      ),
      actionLabel: "View equipment",
    });
  }

  if (
    input.daysSinceLastCompleted != null &&
    input.daysSinceLastCompleted >= CUSTOMER_360_NO_RECENT_SERVICE_DAYS
  ) {
    opportunities.push({
      type: "no_recent_service",
      title: "No recent service",
      description: `No completed jobs in ${input.daysSinceLastCompleted} days.`,
      severity: "warning",
      ...(canCreateJob
        ? {
            href: createJobForCustomerHref(customerId),
            actionLabel: "Create job",
          }
        : {}),
    });
  }

  return opportunities.sort(
    (left, right) =>
      OPPORTUNITY_TYPE_ORDER.indexOf(left.type) -
      OPPORTUNITY_TYPE_ORDER.indexOf(right.type),
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

export function buildCustomer360Data(input: Customer360BuildInput): Customer360Data {
  const openEstimates = input.estimates.filter(isOpenEstimate);
  const expiredEstimates = input.estimates.filter(isExpiredEstimate);
  const openJobs = input.jobs.filter(isOpenJob).sort(compareOpenJobs);
  const daysSinceLastCompleted = daysSinceLastCompletedJob(input.jobs);
  const equipmentSnapshot = buildEquipmentSnapshot(input.equipment);
  const unpaidInvoices = input.invoices
    .filter(hasInvoiceUnpaidBalance)
    .sort((left, right) => right.balanceDue - left.balanceDue);

  const financial = input.includeBilling
    ? computeCustomerFinancialSummary(input.invoices)
    : null;

  const opportunities = buildOpportunities({
    actionContext: input.actionContext,
    includeBilling: input.includeBilling,
    openEstimates,
    expiredEstimates,
    openJobs,
    agingEquipmentCount: equipmentSnapshot.agingCount,
    daysSinceLastCompleted,
    unpaidInvoices,
  });

  return {
    identity: buildIdentitySummary(input.customer),
    financial,
    equipment: equipmentSnapshot,
    opportunities,
    recentActivity: input.activities.slice(0, CUSTOMER_360_ACTIVITY_LIMIT),
    limitations: resolveCustomer360Limitations(input),
  };
}

export async function getCustomer360Data(
  companyId: string,
  customerId: string,
  preloaded?: Customer360PreloadedData,
): Promise<Customer360Data | null> {
  const includeBilling = preloaded?.includeBilling ?? true;
  const actionContext = preloaded?.actionContext ?? {
    customerId,
    canCreateJob: false,
    canAccessDispatch: false,
  };

  const customer =
    preloaded?.customer ?? (await getCustomerById(companyId, customerId));

  if (!customer) {
    return null;
  }

  const [jobs, estimates, invoices, equipment, activities] = await Promise.all([
    preloaded?.jobs ??
      listJobsByCustomer(companyId, customerId, CUSTOMER_360_RECORD_LIMIT),
    includeBilling
      ? preloaded?.estimates ??
        listEstimatesByCustomer(
          companyId,
          customerId,
          CUSTOMER_360_RECORD_LIMIT,
        )
      : Promise.resolve([]),
    includeBilling
      ? preloaded?.invoices ??
        listInvoicesByCustomer(
          companyId,
          customerId,
          CUSTOMER_360_RECORD_LIMIT,
        )
      : Promise.resolve([]),
    preloaded?.equipment ??
      listCustomerEquipment(companyId, customerId, { includeInactive: true }),
    preloaded?.activities ??
      listOperationalActivitiesForCustomer(companyId, customerId, {
        includeBillingActivities: includeBilling,
      }),
  ]);

  return buildCustomer360Data({
    customer,
    jobs,
    estimates,
    invoices,
    equipment,
    activities,
    includeBilling,
    actionContext,
  });
}
