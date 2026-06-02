import {
  getVoidInvoiceBlockReason,
  type Invoice,
  type InvoiceStatus,
} from "@/shared/types/invoice";

export type InvoiceDeleteDependencies = {
  paymentCount: number;
};

export type InvoiceLifecycleActionId =
  | "archive"
  | "restore"
  | "void"
  | "moveToTrash"
  | "restoreFromTrash"
  | "permanentDelete";

export type InvoiceLifecycleState = "active" | "archived" | "deleted" | "voided";

const PAID_STATUSES = new Set<InvoiceStatus>(["paid", "partially_paid"]);
const FINANCIAL_STATUSES = new Set<InvoiceStatus>([
  "paid",
  "partially_paid",
  "sent",
  "overdue",
]);

export const INVOICE_TRASH_BLOCKED_MESSAGE =
  "Only draft invoices can move to Recently Deleted. Void sent or unpaid invoices instead.";

export const INVOICE_PERMANENT_DELETE_BLOCKED_MESSAGE =
  "Financial invoices cannot be permanently deleted. Void or archive them to preserve audit history.";

export function isInvoiceDeleted(invoice: Pick<Invoice, "deletedAt">): boolean {
  return Boolean(invoice.deletedAt);
}

export function isInvoiceArchived(invoice: Pick<Invoice, "archivedAt">): boolean {
  return Boolean(invoice.archivedAt);
}

export function isInvoiceVoided(invoice: Pick<Invoice, "status">): boolean {
  return invoice.status === "void" || invoice.status === "cancelled";
}

export function getInvoiceLifecycleState(
  invoice: Pick<Invoice, "archivedAt" | "deletedAt" | "status">,
): InvoiceLifecycleState {
  if (isInvoiceDeleted(invoice)) return "deleted";
  if (isInvoiceVoided(invoice)) return "voided";
  if (isInvoiceArchived(invoice)) return "archived";
  return "active";
}

export function getArchiveInvoiceBlockReason(
  invoice: Pick<Invoice, "archivedAt" | "deletedAt" | "status">,
): string | null {
  if (isInvoiceDeleted(invoice)) {
    return "This invoice is in Recently Deleted. Restore it first.";
  }
  if (isInvoiceArchived(invoice)) {
    return "This invoice is already archived.";
  }
  if (PAID_STATUSES.has(invoice.status)) {
    return "Paid invoices cannot be archived. They must remain in billing history.";
  }
  if (invoice.status === "void" || invoice.status === "cancelled") {
    return "Void or cancelled invoices are already inactive.";
  }
  return null;
}

export function canArchiveInvoice(
  invoice: Pick<Invoice, "archivedAt" | "deletedAt" | "status">,
): boolean {
  return getArchiveInvoiceBlockReason(invoice) === null;
}

export function getRestoreInvoiceBlockReason(
  invoice: Pick<Invoice, "archivedAt" | "deletedAt">,
): string | null {
  if (isInvoiceDeleted(invoice)) {
    return "This invoice is in Recently Deleted. Use restore from Recently Deleted.";
  }
  if (!isInvoiceArchived(invoice)) {
    return "This invoice is not archived.";
  }
  return null;
}

export function canRestoreInvoice(
  invoice: Pick<Invoice, "archivedAt" | "deletedAt">,
): boolean {
  return getRestoreInvoiceBlockReason(invoice) === null;
}

export function getVoidInvoiceLifecycleBlockReason(
  invoice: Pick<Invoice, "status" | "amountPaid" | "deletedAt">,
): string | null {
  if (isInvoiceDeleted(invoice)) {
    return "This invoice is in Recently Deleted. Restore it first.";
  }
  return getVoidInvoiceBlockReason(invoice);
}

export function canVoidInvoiceLifecycle(
  invoice: Pick<Invoice, "status" | "amountPaid" | "deletedAt">,
): boolean {
  return getVoidInvoiceLifecycleBlockReason(invoice) === null;
}

export function getMoveInvoiceToTrashBlockReason(
  invoice: Pick<Invoice, "status" | "deletedAt" | "amountPaid">,
): string | null {
  if (isInvoiceDeleted(invoice)) {
    return "This invoice is already in Recently Deleted.";
  }
  if (invoice.status !== "draft") {
    return INVOICE_TRASH_BLOCKED_MESSAGE;
  }
  if (invoice.amountPaid > 0) {
    return "Invoices with payments cannot be moved to Recently Deleted.";
  }
  return null;
}

export function canMoveInvoiceToTrash(
  invoice: Pick<Invoice, "status" | "deletedAt" | "amountPaid">,
): boolean {
  return getMoveInvoiceToTrashBlockReason(invoice) === null;
}

export function getRestoreInvoiceFromTrashBlockReason(
  invoice: Pick<Invoice, "deletedAt">,
): string | null {
  if (!isInvoiceDeleted(invoice)) {
    return "This invoice is not in Recently Deleted.";
  }
  return null;
}

export function canRestoreInvoiceFromTrash(
  invoice: Pick<Invoice, "deletedAt">,
): boolean {
  return getRestoreInvoiceFromTrashBlockReason(invoice) === null;
}

export function getPermanentDeleteInvoiceBlockReason(
  invoice: Pick<Invoice, "deletedAt" | "status" | "amountPaid">,
  dependencies: InvoiceDeleteDependencies,
): string | null {
  if (!isInvoiceDeleted(invoice)) {
    return "Move this invoice to Recently Deleted before permanently deleting.";
  }
  if (invoice.status !== "draft" || FINANCIAL_STATUSES.has(invoice.status)) {
    return INVOICE_PERMANENT_DELETE_BLOCKED_MESSAGE;
  }
  if (PAID_STATUSES.has(invoice.status) || invoice.amountPaid > 0) {
    return "Paid invoices cannot be permanently deleted.";
  }
  if (dependencies.paymentCount > 0) {
    return INVOICE_PERMANENT_DELETE_BLOCKED_MESSAGE;
  }
  return null;
}

export function canPermanentlyDeleteInvoice(
  invoice: Pick<Invoice, "deletedAt" | "status" | "amountPaid">,
  dependencies: InvoiceDeleteDependencies,
): boolean {
  return getPermanentDeleteInvoiceBlockReason(invoice, dependencies) === null;
}

export function formatBulkInvoicesResultMessage(input: {
  successCount: number;
  failureCount: number;
  actionLabel: string;
}): string {
  const { successCount, failureCount, actionLabel } = input;

  if (successCount === 0 && failureCount === 0) {
    return "No invoices were updated.";
  }

  if (failureCount === 0) {
    return `${actionLabel} applied to ${successCount} invoice${
      successCount === 1 ? "" : "s"
    }.`;
  }

  if (successCount === 0) {
    return `${failureCount} invoice${failureCount === 1 ? "" : "s"} could not be updated.`;
  }

  return `${actionLabel} applied to ${successCount} invoice${
    successCount === 1 ? "" : "s"
  }. ${failureCount} could not be updated.`;
}

export function isBulkInvoiceActionDestructive(
  actionId: InvoiceLifecycleActionId,
): boolean {
  return actionId === "permanentDelete";
}

export function resolveBulkInvoiceLifecycleActions(
  lifecycleFilter: InvoiceLifecycleState,
): InvoiceLifecycleActionId[] {
  if (lifecycleFilter === "archived") {
    return ["restore", "void", "moveToTrash"];
  }
  if (lifecycleFilter === "voided") {
    return ["archive"];
  }
  if (lifecycleFilter === "deleted") {
    return ["restoreFromTrash", "permanentDelete"];
  }
  return ["archive", "void", "moveToTrash"];
}
