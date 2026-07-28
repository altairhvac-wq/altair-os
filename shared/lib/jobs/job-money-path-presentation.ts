/**
 * Presentation-only Money Path stage resolution for North Star Job Detail.
 * Reuses existing estimate/invoice selectors and profitability totals.
 * Does not invent financial states or mutate billing workflow.
 */

import {
  selectActiveEstimate,
  type JobEstimateSummary,
  type JobInvoiceSummary,
} from "@/shared/lib/job-next-business-action";
import {
  formatEstimateStatus,
  type EstimateStatus,
} from "@/shared/types/estimate";
import {
  formatInvoiceStatus,
  hasInvoiceUnpaidBalance,
  isActiveInvoice,
  roundCurrency,
  type InvoiceStatus,
} from "@/shared/types/invoice";
import type { JobProfitabilitySnapshot } from "@/shared/types/job-profitability";
import { safeBuildQueueActionHref } from "@/shared/types/office-review-queue";

export type JobMoneyPathEstimateStage = {
  present: boolean;
  documentNumber: string | null;
  statusLabel: string;
  total: number | null;
  href: string | null;
  documentCount: number;
};

export type JobMoneyPathInvoiceStage = {
  present: boolean;
  documentNumber: string | null;
  statusLabel: string;
  total: number | null;
  amountPaid: number;
  balanceDue: number;
  href: string | null;
  documentCount: number;
};

export type JobMoneyPathPaymentStage = {
  collected: number;
  outstanding: number;
  invoiced: number;
  statusLabel: string;
  href: string | null;
};

export type JobMoneyPathModel = {
  estimate: JobMoneyPathEstimateStage;
  invoice: JobMoneyPathInvoiceStage;
  payment: JobMoneyPathPaymentStage;
};

function selectPrimaryInvoice(
  invoices: JobInvoiceSummary[],
): JobInvoiceSummary | null {
  return (
    invoices
      .filter((invoice) => isActiveInvoice(invoice))
      .sort(
        (left, right) =>
          Date.parse(right.createdAt) - Date.parse(left.createdAt),
      )[0] ??
    invoices
      .slice()
      .sort(
        (left, right) =>
          Date.parse(right.createdAt) - Date.parse(left.createdAt),
      )[0] ??
    null
  );
}

function selectDisplayEstimate(
  estimates: JobEstimateSummary[],
): JobEstimateSummary | null {
  const active = selectActiveEstimate(estimates);
  if (active) {
    return active;
  }

  return (
    estimates
      .slice()
      .sort(
        (left, right) =>
          Date.parse(right.createdAt) - Date.parse(left.createdAt),
      )[0] ?? null
  );
}

function resolveEstimateStatusLabel(
  status: EstimateStatus,
  hasInvoice: boolean,
): string {
  switch (status) {
    case "draft":
      return "Draft";
    case "sent":
      return "Awaiting approval";
    case "approved":
      return hasInvoice ? "Approved" : "Ready to invoice";
    case "declined":
      return "Declined";
    case "converted":
      return "Converted";
    case "cancelled":
      return "Cancelled";
    default:
      return formatEstimateStatus(status);
  }
}

function resolveInvoiceStatusLabel(status: InvoiceStatus): string {
  switch (status) {
    case "draft":
      return "Draft";
    case "sent":
      return "Sent";
    case "overdue":
      return "Overdue";
    case "partially_paid":
      return "Partially paid";
    case "paid":
      return "Paid";
    case "void":
      return "Void";
    case "cancelled":
      return "Cancelled";
    default:
      return formatInvoiceStatus(status);
  }
}

function resolvePaymentStatusLabel(input: {
  invoice: JobInvoiceSummary | null;
  collected: number;
  outstanding: number;
}): string {
  const { invoice, collected, outstanding } = input;

  if (!invoice) {
    return "Not started";
  }

  if (invoice.status === "draft") {
    return "Not due yet";
  }

  if (invoice.status === "paid" || (outstanding <= 0 && collected > 0)) {
    return "Paid";
  }

  if (outstanding > 0 && collected > 0) {
    return "Payment outstanding";
  }

  if (hasInvoiceUnpaidBalance(invoice) || outstanding > 0) {
    return "Payment outstanding";
  }

  return "Not started";
}

function resolveEstimateTotal(
  estimate: JobEstimateSummary | null,
  profitability: JobProfitabilitySnapshot | null,
): number | null {
  if (!estimate || !profitability?.projectedRevenue) {
    return null;
  }

  if (profitability.projectedRevenue.estimateId !== estimate.id) {
    return null;
  }

  return profitability.projectedRevenue.total;
}

function resolveInvoiceTotal(invoice: JobInvoiceSummary | null): number | null {
  if (!invoice || !isActiveInvoice(invoice)) {
    return null;
  }

  return roundCurrency(invoice.amountPaid + invoice.balanceDue);
}

export function buildJobMoneyPathModel(input: {
  estimates: JobEstimateSummary[];
  invoices: JobInvoiceSummary[];
  profitability: JobProfitabilitySnapshot | null;
  canViewBilling: boolean;
}): JobMoneyPathModel {
  const { estimates, invoices, profitability, canViewBilling } = input;
  const estimate = selectDisplayEstimate(estimates);
  const invoice = selectPrimaryInvoice(invoices);
  const collected = profitability?.revenue.collected ?? 0;
  const outstanding = profitability?.revenue.outstanding ?? 0;
  const invoiced = profitability?.revenue.invoiced ?? 0;

  const estimateHref =
    canViewBilling && estimate
      ? safeBuildQueueActionHref(`/estimates/${encodeURIComponent(estimate.id)}`)
      : null;
  const invoiceHref =
    canViewBilling && invoice
      ? safeBuildQueueActionHref(`/invoices/${encodeURIComponent(invoice.id)}`)
      : null;

  return {
    estimate: {
      present: Boolean(estimate),
      documentNumber: estimate?.estimateNumber ?? null,
      statusLabel: estimate
        ? resolveEstimateStatusLabel(estimate.status, Boolean(invoice))
        : "Not created",
      total: resolveEstimateTotal(estimate, profitability),
      href: estimateHref,
      documentCount: estimates.length,
    },
    invoice: {
      present: Boolean(invoice),
      documentNumber: invoice?.invoiceNumber ?? null,
      statusLabel: invoice
        ? resolveInvoiceStatusLabel(invoice.status)
        : "Not created",
      total: resolveInvoiceTotal(invoice) ?? (invoiced > 0 ? invoiced : null),
      amountPaid: invoice?.amountPaid ?? collected,
      balanceDue: invoice?.balanceDue ?? outstanding,
      href: invoiceHref,
      documentCount: invoices.filter((row) => isActiveInvoice(row)).length ||
        invoices.length,
    },
    payment: {
      collected,
      outstanding,
      invoiced,
      statusLabel: resolvePaymentStatusLabel({
        invoice,
        collected,
        outstanding,
      }),
      href: invoiceHref,
    },
  };
}
