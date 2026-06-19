import { getDateOnlyInTimeZone } from "@/shared/lib/datetime";
import {
  hasInvoiceUnpaidBalance,
  type Invoice,
} from "@/shared/types/invoice";

const DUE_SOON_DAYS = 7;

export function isInvoiceOpenForOwnerView(invoice: Invoice): boolean {
  return invoice.status !== "void" && invoice.status !== "cancelled";
}

export function isInvoiceNeedingCollection(invoice: Invoice): boolean {
  if (invoice.status === "draft") {
    return true;
  }

  return hasInvoiceUnpaidBalance(invoice);
}

function isOverdueUnpaid(invoice: Invoice): boolean {
  return invoice.status === "overdue" && hasInvoiceUnpaidBalance(invoice);
}

export function isInvoiceDueSoonUnpaid(
  invoice: Invoice,
  timeZone?: string,
): boolean {
  if (!hasInvoiceUnpaidBalance(invoice)) {
    return false;
  }

  if (invoice.status === "overdue") {
    return false;
  }

  if (!invoice.dueDate) {
    return false;
  }

  const today = getDateOnlyInTimeZone(new Date(), timeZone);
  const todayMs = Date.parse(today);
  const dueMs = Date.parse(invoice.dueDate);

  if (!Number.isFinite(todayMs) || !Number.isFinite(dueMs)) {
    return false;
  }

  const diffDays = (dueMs - todayMs) / (1000 * 60 * 60 * 24);
  return diffDays >= 0 && diffDays <= DUE_SOON_DAYS;
}

function getOwnerPriorityRank(invoice: Invoice, timeZone?: string): number {
  if (isOverdueUnpaid(invoice)) {
    return 1;
  }

  if (isInvoiceDueSoonUnpaid(invoice, timeZone)) {
    return 2;
  }

  if (
    (invoice.status === "sent" || invoice.status === "partially_paid") &&
    hasInvoiceUnpaidBalance(invoice)
  ) {
    return 3;
  }

  if (invoice.status === "draft") {
    return 4;
  }

  if (invoice.status === "paid") {
    return 5;
  }

  return 6;
}

function getTimestamp(value: string | undefined): number {
  if (!value) {
    return 0;
  }

  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function compareInvoicesWithinRank(
  left: Invoice,
  right: Invoice,
  rank: number,
): number {
  if (rank === 1 || rank === 2) {
    const dueDiff = getTimestamp(left.dueDate) - getTimestamp(right.dueDate);

    if (dueDiff !== 0) {
      return dueDiff;
    }
  }

  if (rank === 3) {
    const balanceDiff = right.balanceDue - left.balanceDue;

    if (balanceDiff !== 0) {
      return balanceDiff;
    }

    const sentDiff =
      getTimestamp(right.sentAt) - getTimestamp(left.sentAt);

    if (sentDiff !== 0) {
      return sentDiff;
    }
  }

  if (rank === 4) {
    const createdDiff =
      getTimestamp(right.createdAt) - getTimestamp(left.createdAt);

    if (createdDiff !== 0) {
      return createdDiff;
    }
  }

  if (rank === 5) {
    const paidDiff = getTimestamp(right.paidAt) - getTimestamp(left.paidAt);

    if (paidDiff !== 0) {
      return paidDiff;
    }
  }

  if (rank === 6) {
    const createdDiff =
      getTimestamp(right.createdAt) - getTimestamp(left.createdAt);

    if (createdDiff !== 0) {
      return createdDiff;
    }
  }

  return left.invoiceNumber.localeCompare(right.invoiceNumber);
}

export function compareInvoicesForOwnerView(
  left: Invoice,
  right: Invoice,
  timeZone?: string,
): number {
  const leftRank = getOwnerPriorityRank(left, timeZone);
  const rightRank = getOwnerPriorityRank(right, timeZone);
  const rankDiff = leftRank - rightRank;

  if (rankDiff !== 0) {
    return rankDiff;
  }

  return compareInvoicesWithinRank(left, right, leftRank);
}

export function sortInvoicesForOwnerView(
  invoices: Invoice[],
  timeZone?: string,
): Invoice[] {
  return [...invoices].sort((left, right) =>
    compareInvoicesForOwnerView(left, right, timeZone),
  );
}
