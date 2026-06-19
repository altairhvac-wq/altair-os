import { getInvoiceLifecycleState } from "@/shared/lib/invoice-lifecycle";
import {
  hasInvoiceUnpaidBalance,
  type Invoice,
} from "@/shared/types/invoice";

export type InvoiceWorkQueue =
  | "needs-action"
  | "drafts"
  | "all-active"
  | "past";

export const INVOICE_WORK_QUEUE_ORDER: readonly InvoiceWorkQueue[] = [
  "needs-action",
  "drafts",
  "all-active",
  "past",
];

export const INVOICE_WORK_QUEUE_LABELS: Record<InvoiceWorkQueue, string> = {
  "needs-action": "Needs action",
  drafts: "Drafts",
  "all-active": "All active",
  past: "Past",
};

/** Active invoices with balance due that are not drafts. */
export function isInvoiceNeedsAction(invoice: Invoice): boolean {
  if (getInvoiceLifecycleState(invoice) !== "active") {
    return false;
  }

  if (invoice.status === "draft" || invoice.status === "paid") {
    return false;
  }

  return (
    invoice.status === "overdue" ||
    invoice.status === "sent" ||
    invoice.status === "partially_paid" ||
    hasInvoiceUnpaidBalance(invoice)
  );
}

/** Active draft invoices waiting to be finished or sent. */
export function isInvoiceDraftQueue(invoice: Invoice): boolean {
  return (
    getInvoiceLifecycleState(invoice) === "active" &&
    invoice.status === "draft"
  );
}

/** Active invoices that are not archived, deleted, or voided. */
export function isInvoiceAllActiveQueue(invoice: Invoice): boolean {
  return getInvoiceLifecycleState(invoice) === "active";
}

/** Paid, voided, archived, deleted, and other closed billing records. */
export function isInvoicePastQueue(invoice: Invoice): boolean {
  const lifecycle = getInvoiceLifecycleState(invoice);

  if (lifecycle !== "active") {
    return true;
  }

  return invoice.status === "paid";
}

export function filterInvoicesForWorkQueue(
  invoices: Invoice[],
  queue: InvoiceWorkQueue,
): Invoice[] {
  const predicate = {
    "needs-action": isInvoiceNeedsAction,
    drafts: isInvoiceDraftQueue,
    "all-active": isInvoiceAllActiveQueue,
    past: isInvoicePastQueue,
  }[queue];

  return invoices.filter(predicate);
}

export function countInvoicesForWorkQueue(
  invoices: Invoice[],
  queue: InvoiceWorkQueue,
): number {
  return filterInvoicesForWorkQueue(invoices, queue).length;
}

function compareInvoiceRecency(left: Invoice, right: Invoice): number {
  const leftTime = Date.parse(left.updatedAt ?? left.createdAt);
  const rightTime = Date.parse(right.updatedAt ?? right.createdAt);

  if (Number.isFinite(leftTime) && Number.isFinite(rightTime) && leftTime !== rightTime) {
    return rightTime - leftTime;
  }

  return right.createdAt.localeCompare(left.createdAt);
}

export function sortInvoicesForWorkQueue(
  invoices: Invoice[],
  queue: InvoiceWorkQueue,
): Invoice[] {
  const sorted = [...invoices];

  if (queue === "drafts" || queue === "past") {
    return sorted.sort(compareInvoiceRecency);
  }

  return sorted;
}
