import { formatAcceptedEstimateSchedulingDescription } from "@/shared/lib/accepted-estimate-scheduling";
import { buildCustomersBookHref } from "@/shared/lib/customers/customers-hub";
import {
  buildDispatchOverloadHref,
  DISPATCH_PAGE_OVERLOAD_HREF,
  DISPATCH_PAGE_UNASSIGNED_HREF,
} from "@/shared/lib/dispatch-page-focus";
import { INVOICE_PAGE_OVERDUE_HREF } from "@/shared/lib/invoice-page-focus";
import { LEADS_NEEDS_CONTACT_QUEUE_HREF } from "@/shared/lib/lead-dashboard-attention";
import { buildSalesHubHref } from "@/shared/lib/sales/sales-hub";
import { buildTeamHubHref } from "@/shared/lib/team/team-hub";
import { buildWorkJobHref } from "@/shared/lib/work/work-hub";
import { formatCurrency } from "@/shared/types/customer";
import type { DashboardData } from "@/shared/types/dashboard";

export type DashboardExceptionBucketId =
  | "payments"
  | "invoices"
  | "dispatch"
  | "jobs"
  | "estimates"
  | "leads"
  | "team"
  | "customers";

export type DashboardExceptionBucketTone = "warning" | "danger" | "info";

export type DashboardExceptionBucketItem = {
  id: string;
  label: string;
  detail?: string;
  href: string;
};

export type DashboardExceptionBucket = {
  id: DashboardExceptionBucketId;
  title: string;
  count: number;
  detail: string;
  href: string;
  tone: DashboardExceptionBucketTone;
  items: DashboardExceptionBucketItem[];
};

/** Fixed critical order — empty buckets stay absent; relative order is preserved. */
export const DASHBOARD_EXCEPTION_BUCKET_ORDER: readonly DashboardExceptionBucketId[] =
  [
    "payments",
    "invoices",
    "dispatch",
    "jobs",
    "estimates",
    "leads",
    "team",
    "customers",
  ] as const;

function pluralize(
  count: number,
  singular: string,
  plural = `${singular}s`,
): string {
  return count === 1 ? singular : plural;
}

export function buildPaymentDisputeAnchorHref(disputeId: string): string {
  return `/settings/subscription#payment-dispute-${disputeId}`;
}

function paymentsBucketHref(
  openDisputeCount: number,
  cardFailureCount: number,
): string {
  if (openDisputeCount > 0) {
    return "/settings/subscription#payment-disputes";
  }

  if (cardFailureCount > 0) {
    return "/settings/subscription#payment-card-failures";
  }

  return "/settings/subscription#customer-payments";
}

function formatPaymentsDetail(
  openDisputeCount: number,
  cardFailureCount: number,
): string {
  const parts: string[] = [];

  if (openDisputeCount > 0) {
    parts.push(
      `${openDisputeCount} open ${pluralize(openDisputeCount, "dispute")}`,
    );
  }

  if (cardFailureCount > 0) {
    parts.push(
      `${cardFailureCount} card ${pluralize(cardFailureCount, "failure")} needing attention`,
    );
  }

  return parts.join(" · ");
}

function leadItemLabel(lead: {
  firstName: string;
  lastName: string;
  companyName?: string;
}): string {
  const personName = `${lead.firstName} ${lead.lastName}`.trim();
  if (personName) return personName;
  if (lead.companyName?.trim()) return lead.companyName.trim();
  return "Lead";
}

/**
 * Builds the Dashboard management-by-exception board.
 * Only returns buckets with count > 0 — callers must not render empty shells.
 * Order is fixed by DASHBOARD_EXCEPTION_BUCKET_ORDER.
 */
export function buildDashboardExceptionBuckets(
  data: DashboardData,
): DashboardExceptionBucket[] {
  const byId = new Map<DashboardExceptionBucketId, DashboardExceptionBucket>();
  const { access, operations, money, paymentAttention } = data;

  if (access.canViewBilling) {
    const { cardFailureCount, openDisputeCount } = paymentAttention;
    const total = cardFailureCount + openDisputeCount;
    if (total > 0) {
      const items: DashboardExceptionBucketItem[] = [
        ...paymentAttention.openDisputes.map((dispute) => ({
          id: `dispute-${dispute.id}`,
          label: formatCurrency(dispute.amount),
          detail: [
            dispute.reason?.replace(/_/g, " ") ?? "Dispute",
            dispute.invoiceNumber ?? null,
          ]
            .filter(Boolean)
            .join(" · "),
          href: buildPaymentDisputeAnchorHref(dispute.id),
        })),
        ...paymentAttention.cardFailures.map((attempt) => ({
          id: `card-failure-${attempt.id}`,
          label: attempt.invoiceNumber
            ? `Invoice ${attempt.invoiceNumber}`
            : "Card payment failed",
          detail: formatCurrency(attempt.amount),
          href: `/invoices/${attempt.invoiceId}`,
        })),
      ];

      byId.set("payments", {
        id: "payments",
        title: "Payments",
        count: total,
        detail: formatPaymentsDetail(openDisputeCount, cardFailureCount),
        href: paymentsBucketHref(openDisputeCount, cardFailureCount),
        tone: openDisputeCount > 0 ? "danger" : "warning",
        items,
      });
    }
  }

  if (access.canViewBilling && money.overdueCount > 0) {
    byId.set("invoices", {
      id: "invoices",
      title: "Invoices",
      count: money.overdueCount,
      detail:
        money.overdueCount === 1
          ? `1 past-due invoice · ${formatCurrency(money.overdueTotal)}`
          : `${money.overdueCount} past-due invoices · ${formatCurrency(money.overdueTotal)}`,
      href: INVOICE_PAGE_OVERDUE_HREF,
      tone: money.overdueCount >= 5 ? "danger" : "warning",
      items: money.overdueInvoices.map((invoice) => ({
        id: invoice.id,
        label: invoice.invoiceNumber,
        detail: `${invoice.customerName} · ${formatCurrency(invoice.balanceDue)}`,
        href: `/invoices/${invoice.id}`,
      })),
    });
  }

  if (
    access.canViewTechnicianRoster &&
    operations.overloadedTechnicians.length > 0
  ) {
    const count = operations.overloadedTechnicians.length;
    byId.set("dispatch", {
      id: "dispatch",
      title: "Dispatch",
      count,
      detail:
        count === 1
          ? "Technician has 2+ active jobs today"
          : `${count} technicians have 2+ active jobs today`,
      href: DISPATCH_PAGE_OVERLOAD_HREF,
      tone: "warning",
      items: operations.overloadedTechnicians.map((technician) => ({
        id: technician.id,
        label: technician.name,
        detail: "2+ active jobs today",
        href: buildDispatchOverloadHref(technician.id),
      })),
    });
  }

  if (
    (access.canViewAllJobs || access.canViewTechnicianRoster) &&
    operations.unassignedToday > 0
  ) {
    const count = operations.unassignedToday;
    byId.set("jobs", {
      id: "jobs",
      title: "Jobs",
      count,
      detail:
        count === 1
          ? "Unassigned job on today's board"
          : `${count} unassigned jobs on today's board`,
      href: DISPATCH_PAGE_UNASSIGNED_HREF,
      tone: count >= 3 ? "danger" : "warning",
      items: operations.unassignedJobs.map((job) => ({
        id: job.id,
        label: job.jobNumber,
        detail: [job.customerName, job.jobType.trim() || null]
          .filter(Boolean)
          .join(" · "),
        href: buildWorkJobHref(job.id),
      })),
    });
  }

  if (
    access.canViewBilling &&
    data.acceptedEstimatesNeedingScheduling.count > 0
  ) {
    const count = data.acceptedEstimatesNeedingScheduling.count;
    byId.set("estimates", {
      id: "estimates",
      title: "Estimates",
      count,
      detail: formatAcceptedEstimateSchedulingDescription(count),
      href: buildSalesHubHref(
        "estimates",
        { status: "approved" },
        { forceTab: true },
      ),
      tone: count >= 3 ? "warning" : "info",
      items: data.acceptedEstimatesNeedingScheduling.estimates.map(
        (estimate) => ({
          id: estimate.id,
          label: estimate.estimateNumber,
          detail: `${estimate.customerName} · ${formatCurrency(estimate.total)}`,
          href: estimate.openHref,
        }),
      ),
    });
  }

  if (
    access.canManageCustomers &&
    data.leadsNeedingContactQueue.count > 0
  ) {
    const count = data.leadsNeedingContactQueue.count;
    byId.set("leads", {
      id: "leads",
      title: "Leads",
      count,
      detail:
        count === 1
          ? "Lead needs first contact or follow-up"
          : `${count} leads need contact or follow-up`,
      href: LEADS_NEEDS_CONTACT_QUEUE_HREF,
      tone: count >= 3 ? "danger" : "warning",
      items: data.leadsNeedingContactQueue.leads.map((lead) => ({
        id: lead.id,
        label: leadItemLabel(lead),
        detail: lead.sourceLabel || undefined,
        href: lead.openHref,
      })),
    });
  }

  if (data.staleOpenShifts.count > 0) {
    const count = data.staleOpenShifts.count;
    byId.set("team", {
      id: "team",
      title: "Team",
      count,
      detail:
        count === 1
          ? "Open shift still clocked in for 12+ hours"
          : `${count} open shifts still clocked in for 12+ hours`,
      href: buildTeamHubHref("time-clock"),
      tone: "warning",
      items: data.staleOpenShifts.shifts.map((shift) => ({
        id: shift.id,
        label: shift.technicianName,
        detail: `${shift.elapsedHours}h open`,
        href: buildTeamHubHref("time-clock", { entry: shift.id }),
      })),
    });
  }

  if (access.canManageCustomers && data.customersNeedingInfo.count > 0) {
    const count = data.customersNeedingInfo.count;
    byId.set("customers", {
      id: "customers",
      title: "Customers",
      count,
      detail:
        count === 1
          ? "Customer missing email, phone, or address"
          : `${count} customers missing email, phone, or address`,
      href: buildCustomersBookHref({ queue: "needs-info" }),
      tone: "info",
      items: data.customersNeedingInfo.customers.map((customer) => ({
        id: customer.id,
        label: customer.name,
        detail: "Missing email, phone, or address",
        href: `/customers/${customer.id}`,
      })),
    });
  }

  return DASHBOARD_EXCEPTION_BUCKET_ORDER.flatMap((id) => {
    const bucket = byId.get(id);
    return bucket ? [bucket] : [];
  });
}
