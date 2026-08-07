import { getInvoiceLifecycleState } from "@/shared/lib/invoice-lifecycle";
import {
  roundCurrency,
  type Invoice,
  type InvoiceStatus,
} from "@/shared/types/invoice";

/**
 * Header filter pills for the Invoices list.
 * Primary status pills and Past are active-lifecycle only. Archived / recently
 * deleted stay on the lifecycle filter (queue scoping is skipped there).
 */
export type InvoiceWorkQueue =
  | "draft"
  | "sent"
  | "partially_paid"
  | "overdue"
  | "paid"
  | "past";

export const INVOICE_WORK_QUEUE_ORDER: readonly InvoiceWorkQueue[] = [
  "draft",
  "sent",
  "partially_paid",
  "overdue",
  "paid",
  "past",
];

export const INVOICE_WORK_QUEUE_LABELS: Record<InvoiceWorkQueue, string> = {
  draft: "Draft",
  sent: "Sent",
  partially_paid: "Partially paid",
  overdue: "Overdue",
  paid: "Paid",
  past: "Past",
};

const PAST_ACTIVE_STATUSES = new Set<InvoiceStatus>(["void", "cancelled"]);

function isActiveInvoiceRecord(invoice: Invoice): boolean {
  return getInvoiceLifecycleState(invoice) === "active";
}

/** Active draft invoices waiting to be finished or sent. */
export function isInvoiceDraftQueue(invoice: Invoice): boolean {
  return isActiveInvoiceRecord(invoice) && invoice.status === "draft";
}

/** Active sent invoices awaiting payment. */
export function isInvoiceSentQueue(invoice: Invoice): boolean {
  return isActiveInvoiceRecord(invoice) && invoice.status === "sent";
}

/** Active partially paid invoices with remaining balance. */
export function isInvoicePartiallyPaidQueue(invoice: Invoice): boolean {
  return isActiveInvoiceRecord(invoice) && invoice.status === "partially_paid";
}

/** Active overdue invoices. */
export function isInvoiceOverdueQueue(invoice: Invoice): boolean {
  return isActiveInvoiceRecord(invoice) && invoice.status === "overdue";
}

/** Active paid invoices. */
export function isInvoicePaidQueue(invoice: Invoice): boolean {
  return isActiveInvoiceRecord(invoice) && invoice.status === "paid";
}

/**
 * Void + cancelled folded like Estimates Past.
 * Invoice void/cancelled rows live in the voided lifecycle (not active).
 */
export function isInvoicePastQueue(invoice: Invoice): boolean {
  return (
    getInvoiceLifecycleState(invoice) === "voided" &&
    PAST_ACTIVE_STATUSES.has(invoice.status)
  );
}

export function matchesInvoiceWorkQueue(
  invoice: Invoice,
  queue: InvoiceWorkQueue,
): boolean {
  switch (queue) {
    case "draft":
      return isInvoiceDraftQueue(invoice);
    case "sent":
      return isInvoiceSentQueue(invoice);
    case "partially_paid":
      return isInvoicePartiallyPaidQueue(invoice);
    case "overdue":
      return isInvoiceOverdueQueue(invoice);
    case "paid":
      return isInvoicePaidQueue(invoice);
    case "past":
      return isInvoicePastQueue(invoice);
  }
}

export function filterInvoicesForWorkQueue(
  invoices: Invoice[],
  queue: InvoiceWorkQueue,
): Invoice[] {
  return invoices.filter((invoice) => matchesInvoiceWorkQueue(invoice, queue));
}

export function countInvoicesForWorkQueue(
  invoices: Invoice[],
  queue: InvoiceWorkQueue,
): number {
  return filterInvoicesForWorkQueue(invoices, queue).length;
}

/** Outstanding balance owed for a status queue (not invoice total). */
export function sumBalanceDueForWorkQueue(
  invoices: Invoice[],
  queue: InvoiceWorkQueue,
): number {
  return roundCurrency(
    filterInvoicesForWorkQueue(invoices, queue).reduce(
      (sum, invoice) =>
        sum + (Number.isFinite(invoice.balanceDue) ? invoice.balanceDue : 0),
      0,
    ),
  );
}

function compareInvoiceRecency(left: Invoice, right: Invoice): number {
  const leftTime = Date.parse(left.updatedAt ?? left.createdAt);
  const rightTime = Date.parse(right.updatedAt ?? right.createdAt);

  if (
    Number.isFinite(leftTime) &&
    Number.isFinite(rightTime) &&
    leftTime !== rightTime
  ) {
    return rightTime - leftTime;
  }

  return right.createdAt.localeCompare(left.createdAt);
}

export function sortInvoicesForWorkQueue(
  invoices: Invoice[],
  queue: InvoiceWorkQueue,
): Invoice[] {
  void queue;
  return [...invoices].sort(compareInvoiceRecency);
}

/**
 * Resolve the landing work queue for the Invoices list.
 * Explicit statusFilter / focus deep-links always win (even if that queue is empty).
 * With no explicit filter, land on the first non-empty queue in
 * INVOICE_WORK_QUEUE_ORDER (excluding "past", which stays explicit-only).
 * Fall back to "draft" when every queue is empty (new company).
 */
export function resolveDefaultInvoiceWorkQueue(
  statusFilter?: InvoiceStatus | "all" | "unpaid",
  focus?: "cash-flow" | null,
  invoices: Invoice[] = [],
): InvoiceWorkQueue {
  if (statusFilter === "draft") return "draft";
  if (statusFilter === "sent") return "sent";
  if (statusFilter === "partially_paid") return "partially_paid";
  if (statusFilter === "overdue") return "overdue";
  if (statusFilter === "paid") return "paid";
  if (statusFilter === "void" || statusFilter === "cancelled") return "past";
  if (statusFilter === "unpaid" || focus === "cash-flow") return "overdue";

  for (const queue of INVOICE_WORK_QUEUE_ORDER) {
    if (queue === "past") continue;
    if (countInvoicesForWorkQueue(invoices, queue) > 0) {
      return queue;
    }
  }

  return "draft";
}
