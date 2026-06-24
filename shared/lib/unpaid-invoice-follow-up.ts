import { daysSinceSentAt } from "@/shared/lib/estimate-recovery";
import {
  hasInvoiceUnpaidBalance,
  isActiveInvoice,
  type Invoice,
  type InvoiceStatus,
} from "@/shared/types/invoice";

/** In-code threshold for V1; not user-configurable yet. */
export const UNPAID_INVOICE_FOLLOW_UP_THRESHOLD_DAYS = 7;

const SENT_UNPAID_STATUSES = new Set<InvoiceStatus>(["sent", "partially_paid"]);

export type UnpaidInvoiceFollowUpEntry = {
  invoiceId: string;
  invoiceNumber: string;
  customerName: string;
  customerEmail?: string;
  balanceDue: number;
  sentAt?: string;
  issueDate: string;
  daysUnpaid: number;
  status: InvoiceStatus;
};

function resolveUnpaidReferenceDate(
  invoice: Pick<Invoice, "sentAt" | "issueDate" | "createdAt">,
): string | null {
  const sentAt = invoice.sentAt?.trim();
  if (sentAt) {
    return sentAt;
  }

  const issueDate = invoice.issueDate?.trim();
  if (issueDate) {
    return issueDate;
  }

  const createdAt = invoice.createdAt?.trim();
  return createdAt || null;
}

export function isInvoiceAwaitingFollowUp(
  invoice: Pick<
    Invoice,
    "status" | "balanceDue" | "sentAt" | "issueDate" | "createdAt"
  >,
  reference = new Date(),
): boolean {
  if (!isActiveInvoice(invoice) || !hasInvoiceUnpaidBalance(invoice)) {
    return false;
  }

  if (invoice.status === "overdue" || invoice.status === "draft") {
    return false;
  }

  if (!SENT_UNPAID_STATUSES.has(invoice.status)) {
    return false;
  }

  const referenceDate = resolveUnpaidReferenceDate(invoice);
  if (!referenceDate) {
    return false;
  }

  return (
    daysSinceSentAt(referenceDate, reference) >=
    UNPAID_INVOICE_FOLLOW_UP_THRESHOLD_DAYS
  );
}

function toUnpaidInvoiceFollowUpEntry(
  invoice: Invoice,
  reference: Date,
): UnpaidInvoiceFollowUpEntry | null {
  if (!invoice.id?.trim()) {
    return null;
  }

  const referenceDate = resolveUnpaidReferenceDate(invoice);
  if (!referenceDate) {
    return null;
  }

  return {
    invoiceId: invoice.id,
    invoiceNumber: invoice.invoiceNumber?.trim() || "Unknown invoice",
    customerName: invoice.customerName?.trim() || "Unknown customer",
    customerEmail: invoice.customerEmail,
    balanceDue: invoice.balanceDue,
    sentAt: invoice.sentAt,
    issueDate: invoice.issueDate,
    daysUnpaid: daysSinceSentAt(referenceDate, reference),
    status: invoice.status,
  };
}

/** Sent unpaid invoices past the follow-up threshold, sorted oldest first. */
export function buildUnpaidInvoiceFollowUpEntries(
  invoices: ReadonlyArray<Invoice>,
  reference = new Date(),
): UnpaidInvoiceFollowUpEntry[] {
  return invoices
    .filter((invoice) => isInvoiceAwaitingFollowUp(invoice, reference))
    .map((invoice) => toUnpaidInvoiceFollowUpEntry(invoice, reference))
    .filter((entry): entry is UnpaidInvoiceFollowUpEntry => entry != null)
    .sort((left, right) => right.daysUnpaid - left.daysUnpaid);
}

function pluralize(
  count: number,
  singular: string,
  plural = `${singular}s`,
): string {
  return count === 1 ? singular : plural;
}

export function formatUnpaidInvoiceFollowUpTitle(count: number): string {
  if (count === 1) {
    return `Invoice unpaid ${UNPAID_INVOICE_FOLLOW_UP_THRESHOLD_DAYS} days — follow up`;
  }

  return `Invoices unpaid ${UNPAID_INVOICE_FOLLOW_UP_THRESHOLD_DAYS}+ days need follow-up`;
}

export function formatUnpaidInvoiceFollowUpDescription(count: number): string {
  if (count === 1) {
    return "Sent invoice with no payment — send a reminder or call the customer";
  }

  return `${count} sent ${pluralize(count, "invoice")} unpaid ${UNPAID_INVOICE_FOLLOW_UP_THRESHOLD_DAYS}+ days — follow up to collect`;
}
