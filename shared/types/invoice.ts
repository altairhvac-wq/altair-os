import {
  addDaysToDateOnly,
  getCompanyTimeZone,
  getDateOnlyInTimeZone,
  parseDateInput,
} from "@/shared/lib/datetime";
import type { JobStatus } from "@/shared/types/job";

export type InvoiceStatus =
  | "draft"
  | "sent"
  | "partially_paid"
  | "paid"
  | "overdue"
  | "void"
  | "cancelled";

export type InvoiceLineItem = {
  id: string;
  serviceItemId?: string;
  name: string;
  description?: string;
  quantity: number;
  unitPrice: number;
  taxable: boolean;
  lineTotal: number;
};

export type Invoice = {
  id: string;
  invoiceNumber: string;
  customerId: string;
  customerName: string;
  customerEmail?: string;
  jobId?: string;
  jobNumber?: string;
  estimateId?: string;
  estimateNumber?: string;
  status: InvoiceStatus;
  lineItems: InvoiceLineItem[];
  lineItemCount?: number;
  subtotal: number;
  taxRate: number;
  taxAmount?: number;
  total: number;
  amountPaid: number;
  balanceDue: number;
  issueDate: string;
  dueDate: string;
  paidAt?: string;
  notes?: string;
  createdAt: string;
  updatedAt?: string;
  sentAt?: string;
  archivedAt?: string;
  deletedAt?: string;
  deleteAfter?: string;
};

export type InvoiceLifecycleState = "active" | "archived" | "deleted" | "voided";

export const INVOICE_LIFECYCLE_FILTER_OPTIONS: {
  value: InvoiceLifecycleState;
  label: string;
}[] = [
  { value: "active", label: "Active invoices" },
  { value: "archived", label: "Archived" },
  { value: "voided", label: "Voided" },
  { value: "deleted", label: "Recently Deleted" },
];

export type InvoiceDetail = Invoice & {
  customerEmail?: string;
  customerPhone?: string;
};

export type InvoiceLineItemFormData = {
  serviceItemId?: string;
  name: string;
  description: string;
  quantity: number;
  unitPrice: number;
  taxable: boolean;
};

export type InvoiceFormData = {
  customerId: string;
  jobId?: string;
  estimateId?: string;
  status: InvoiceStatus;
  issueDate: string;
  dueDate: string;
  notes: string;
  taxRate: number;
  lineItems: InvoiceLineItemFormData[];
};

/** Editable invoice fields before any payment is collected. */
export type InvoiceEditFormData = {
  dueDate: string;
  notes: string;
  lineItems: InvoiceLineItemFormData[];
};

export const INVOICE_STATUS_OPTIONS: {
  value: InvoiceStatus | "all";
  label: string;
}[] = [
  { value: "all", label: "All statuses" },
  { value: "draft", label: "Draft" },
  { value: "sent", label: "Sent" },
  { value: "partially_paid", label: "Partially paid" },
  { value: "paid", label: "Paid" },
  { value: "overdue", label: "Overdue" },
  { value: "void", label: "Void" },
  { value: "cancelled", label: "Cancelled" },
];

export const INVOICE_DUE_DAYS = 30;

export function calculateLineItemTotal(
  quantity: number,
  unitPrice: number,
): number {
  return roundCurrency(quantity * unitPrice);
}

export function calculateInvoiceSubtotal(
  lineItems: Pick<InvoiceLineItem, "quantity" | "unitPrice">[],
): number {
  return roundCurrency(
    lineItems.reduce(
      (sum, item) => sum + calculateLineItemTotal(item.quantity, item.unitPrice),
      0,
    ),
  );
}

export function calculateTaxableSubtotal(
  lineItems: Pick<InvoiceLineItem, "quantity" | "unitPrice" | "taxable">[],
): number {
  return roundCurrency(
    lineItems.reduce((sum, item) => {
      if (!item.taxable) return sum;
      return sum + calculateLineItemTotal(item.quantity, item.unitPrice);
    }, 0),
  );
}

export function calculateTaxAmount(
  taxableSubtotal: number,
  taxRate: number,
): number {
  const normalizedRate = Math.max(taxRate, 0);
  return roundCurrency(taxableSubtotal * (normalizedRate / 100));
}

export function calculateInvoiceTotals(
  lineItems: Pick<InvoiceLineItem, "quantity" | "unitPrice" | "taxable">[],
  taxRate: number,
): {
  subtotal: number;
  taxableSubtotal: number;
  taxAmount: number;
  total: number;
} {
  const subtotal = calculateInvoiceSubtotal(lineItems);
  const taxableSubtotal = calculateTaxableSubtotal(lineItems);
  const taxAmount = calculateTaxAmount(taxableSubtotal, taxRate);
  const total = roundCurrency(subtotal + taxAmount);

  return { subtotal, taxableSubtotal, taxAmount, total };
}

export function getDefaultIssueDate(
  fromDate: Date = new Date(),
  timeZone: string = getCompanyTimeZone(),
): string {
  return getDateOnlyInTimeZone(fromDate, timeZone);
}

export function getDefaultDueDate(
  fromDate: Date = new Date(),
  timeZone: string = getCompanyTimeZone(),
): string {
  const issueDateOnly = getDateOnlyInTimeZone(fromDate, timeZone);
  return addDaysToDateOnly(issueDateOnly, INVOICE_DUE_DAYS, timeZone);
}

export function resolveDueDate(
  issueDate: string,
  dueDate: string,
  timeZone: string = getCompanyTimeZone(),
): string {
  const trimmedDueDate = dueDate.trim();
  if (trimmedDueDate) {
    return trimmedDueDate;
  }

  const parsedIssueDate = issueDate.trim()
    ? parseDateInput(issueDate.trim())
    : new Date();

  return getDefaultDueDate(parsedIssueDate, timeZone);
}

export function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100;
}

export function formatInvoiceStatus(status: InvoiceStatus): string {
  return (
    INVOICE_STATUS_OPTIONS.find((option) => option.value === status)?.label ??
    status
  );
}

export function formatTaxRate(taxRate: number): string {
  const normalized = roundCurrency(Math.max(taxRate, 0));
  return Number.isInteger(normalized)
    ? String(normalized)
    : normalized.toFixed(2).replace(/\.?0+$/, "");
}

export function isActiveInvoice(invoice: Pick<Invoice, "status">): boolean {
  return invoice.status !== "void" && invoice.status !== "cancelled";
}

/** New invoices always start as draft; sent requires email confirmation. */
export const INVOICE_CREATE_STATUS: InvoiceStatus = "draft";

export function canCreateInvoiceForJob(jobStatus: JobStatus): boolean {
  return jobStatus !== "cancelled";
}

export function getCreateInvoiceJobBlockReason(
  jobStatus: JobStatus,
): string | null {
  if (jobStatus === "cancelled") {
    return "Invoices cannot be created for cancelled jobs.";
  }

  return null;
}

export function canSendInvoiceForJob(jobStatus: JobStatus): boolean {
  return jobStatus !== "cancelled";
}

export function getSendInvoiceJobBlockReason(jobStatus: JobStatus): string | null {
  if (jobStatus === "cancelled") {
    return "Invoices cannot be sent for cancelled jobs.";
  }

  return null;
}

/** Non-draft invoices that were emailed can be resent without a status change. */
export function canResendInvoiceEmail(status: InvoiceStatus): boolean {
  return (
    status === "sent" ||
    status === "partially_paid" ||
    status === "paid" ||
    status === "overdue"
  );
}

/** Sent/post-sent invoices eligible for a public customer payment link. */
export function canShowInvoicePaymentLink(status: InvoiceStatus): boolean {
  return canResendInvoiceEmail(status);
}

export function isInvoiceBalanceConsistent(invoice: {
  total: number;
  amountPaid: number;
  balanceDue: number;
}): boolean {
  return (
    roundCurrency(invoice.amountPaid + invoice.balanceDue) ===
    roundCurrency(invoice.total)
  );
}

export function canVoidInvoice(
  invoice: Pick<Invoice, "status" | "amountPaid">,
): boolean {
  if (
    invoice.status === "void" ||
    invoice.status === "cancelled" ||
    invoice.status === "paid" ||
    invoice.status === "partially_paid" ||
    invoice.amountPaid > 0
  ) {
    return false;
  }

  return (
    invoice.status === "draft" ||
    invoice.status === "sent" ||
    invoice.status === "overdue"
  );
}

export function canEditInvoice(
  invoice: Pick<Invoice, "status" | "amountPaid">,
  paymentCount = 0,
): boolean {
  if (paymentCount > 0 || invoice.amountPaid > 0) {
    return false;
  }

  if (
    invoice.status === "paid" ||
    invoice.status === "partially_paid" ||
    invoice.status === "void" ||
    invoice.status === "cancelled"
  ) {
    return false;
  }

  return (
    invoice.status === "draft" ||
    invoice.status === "sent" ||
    invoice.status === "overdue"
  );
}

export function getEditInvoiceBlockReason(
  invoice: Pick<Invoice, "status" | "amountPaid">,
  paymentCount = 0,
): string | null {
  if (paymentCount > 0 || invoice.amountPaid > 0) {
    return "Invoices with recorded payments cannot be edited.";
  }

  if (invoice.status === "paid") {
    return "Paid invoices cannot be edited.";
  }

  if (invoice.status === "partially_paid") {
    return "Partially paid invoices cannot be edited.";
  }

  if (invoice.status === "void") {
    return "Void invoices cannot be edited.";
  }

  if (invoice.status === "cancelled") {
    return "Cancelled invoices cannot be edited.";
  }

  if (!canEditInvoice(invoice, paymentCount)) {
    return "This invoice cannot be edited in its current status.";
  }

  return null;
}

export function getVoidInvoiceBlockReason(
  invoice: Pick<Invoice, "status" | "amountPaid">,
): string | null {
  if (invoice.status === "void") {
    return "This invoice is already void.";
  }

  if (invoice.status === "cancelled") {
    return "This invoice has been cancelled.";
  }

  if (invoice.status === "paid") {
    return "Paid invoices cannot be voided.";
  }

  if (invoice.status === "partially_paid" || invoice.amountPaid > 0) {
    return "Invoices with recorded payments cannot be voided.";
  }

  if (!canVoidInvoice(invoice)) {
    return "This invoice cannot be voided in its current status.";
  }

  return null;
}

/** Matches dashboard money snapshot and summary-card unpaid totals. */
export function hasInvoiceUnpaidBalance(
  invoice: Pick<Invoice, "status" | "balanceDue">,
): boolean {
  return (
    isActiveInvoice(invoice) &&
    invoice.status !== "paid" &&
    invoice.balanceDue > 0
  );
}

export function getInvoiceSummary(invoices: Invoice[]) {
  const active = invoices.filter(isActiveInvoice);

  const unpaidTotal = active
    .filter(hasInvoiceUnpaidBalance)
    .reduce((sum, inv) => sum + inv.balanceDue, 0);

  const paidTotal = active
    .filter((inv) => inv.status === "paid")
    .reduce((sum, inv) => sum + inv.total, 0);

  const overdueTotal = active
    .filter((inv) => inv.status === "overdue")
    .reduce((sum, inv) => sum + inv.balanceDue, 0);

  return { unpaidTotal, paidTotal, overdueTotal };
}

const INACTIVE_INVOICE_STATUSES = new Set<InvoiceStatus>(["void", "cancelled"]);

export function getReopenCompletedJobBlockReason(
  invoices: Pick<Invoice, "status" | "amountPaid">[],
): string | null {
  if (invoices.some((invoice) => invoice.amountPaid > 0)) {
    return "Jobs with payments cannot be reopened.";
  }

  if (
    invoices.some((invoice) => !INACTIVE_INVOICE_STATUSES.has(invoice.status))
  ) {
    return "Void linked invoices before reopening this job.";
  }

  return null;
}
