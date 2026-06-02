import type { Customer } from "@/shared/types/customer";

export type CustomerDeleteDependencies = {
  jobCount: number;
  estimateCount: number;
  invoiceCount: number;
  invoicePaymentCount: number;
};

export type CustomerLifecycleActionId =
  | "archive"
  | "restore"
  | "moveToTrash"
  | "restoreFromTrash"
  | "permanentDelete";

export const PERMANENT_DELETE_BLOCKED_MESSAGE =
  "This customer has historical records and cannot be permanently deleted. Keep it in Recently Deleted or restore it.";

export function isCustomerDeleted(
  customer: Pick<Customer, "deletedAt">,
): boolean {
  return Boolean(customer.deletedAt);
}

export function isCustomerArchived(
  customer: Pick<Customer, "archivedAt">,
): boolean {
  return Boolean(customer.archivedAt);
}

export function getCustomerLifecycleState(
  customer: Pick<Customer, "archivedAt" | "deletedAt">,
): "active" | "archived" | "deleted" {
  if (isCustomerDeleted(customer)) {
    return "deleted";
  }

  if (isCustomerArchived(customer)) {
    return "archived";
  }

  return "active";
}

export function getArchiveCustomerBlockReason(
  customer: Pick<Customer, "archivedAt" | "deletedAt">,
): string | null {
  if (isCustomerDeleted(customer)) {
    return "This customer is in Recently Deleted. Restore it first.";
  }

  if (isCustomerArchived(customer)) {
    return "This customer is already archived.";
  }

  return null;
}

export function canArchiveCustomer(
  customer: Pick<Customer, "archivedAt" | "deletedAt">,
): boolean {
  return getArchiveCustomerBlockReason(customer) === null;
}

export function getRestoreCustomerBlockReason(
  customer: Pick<Customer, "archivedAt" | "deletedAt">,
): string | null {
  if (isCustomerDeleted(customer)) {
    return "This customer is in Recently Deleted. Use restore from Recently Deleted.";
  }

  if (!isCustomerArchived(customer)) {
    return "This customer is not archived.";
  }

  return null;
}

export function canRestoreCustomer(
  customer: Pick<Customer, "archivedAt" | "deletedAt">,
): boolean {
  return getRestoreCustomerBlockReason(customer) === null;
}

export function getMoveCustomerToTrashBlockReason(
  customer: Pick<Customer, "deletedAt">,
): string | null {
  if (isCustomerDeleted(customer)) {
    return "This customer is already in Recently Deleted.";
  }

  return null;
}

export function canMoveCustomerToTrash(
  customer: Pick<Customer, "deletedAt">,
): boolean {
  return getMoveCustomerToTrashBlockReason(customer) === null;
}

export function getRestoreCustomerFromTrashBlockReason(
  customer: Pick<Customer, "deletedAt">,
): string | null {
  if (!isCustomerDeleted(customer)) {
    return "This customer is not in Recently Deleted.";
  }

  return null;
}

export function canRestoreCustomerFromTrash(
  customer: Pick<Customer, "deletedAt">,
): boolean {
  return getRestoreCustomerFromTrashBlockReason(customer) === null;
}

export function getPermanentDeleteCustomerBlockReason(
  customer: Pick<Customer, "deletedAt">,
  dependencies: CustomerDeleteDependencies,
): string | null {
  const trashBlockReason = getRestoreCustomerFromTrashBlockReason(customer);
  if (trashBlockReason) {
    return "Move this customer to Recently Deleted before permanently deleting.";
  }

  const dependencyBlockers: string[] = [];

  if (dependencies.jobCount > 0) {
    dependencyBlockers.push(
      `${dependencies.jobCount} job${dependencies.jobCount === 1 ? "" : "s"}`,
    );
  }

  if (dependencies.estimateCount > 0) {
    dependencyBlockers.push(
      `${dependencies.estimateCount} estimate${dependencies.estimateCount === 1 ? "" : "s"}`,
    );
  }

  if (dependencies.invoiceCount > 0) {
    dependencyBlockers.push(
      `${dependencies.invoiceCount} invoice${dependencies.invoiceCount === 1 ? "" : "s"}`,
    );
  }

  if (dependencies.invoicePaymentCount > 0) {
    dependencyBlockers.push(
      `${dependencies.invoicePaymentCount} invoice payment${dependencies.invoicePaymentCount === 1 ? "" : "s"}`,
    );
  }

  if (dependencyBlockers.length > 0) {
    return PERMANENT_DELETE_BLOCKED_MESSAGE;
  }

  return null;
}

export function canPermanentlyDeleteCustomer(
  customer: Pick<Customer, "deletedAt">,
  dependencies: CustomerDeleteDependencies,
): boolean {
  return getPermanentDeleteCustomerBlockReason(customer, dependencies) === null;
}

export function getBulkArchiveCustomerBlockReason(
  customer: Pick<Customer, "archivedAt" | "deletedAt">,
): string | null {
  return getArchiveCustomerBlockReason(customer);
}

export function getBulkRestoreCustomerBlockReason(
  customer: Pick<Customer, "archivedAt" | "deletedAt">,
): string | null {
  return getRestoreCustomerBlockReason(customer);
}

export function getBulkMoveCustomerToTrashBlockReason(
  customer: Pick<Customer, "deletedAt">,
): string | null {
  return getMoveCustomerToTrashBlockReason(customer);
}

export function getBulkRestoreCustomerFromTrashBlockReason(
  customer: Pick<Customer, "deletedAt">,
): string | null {
  return getRestoreCustomerFromTrashBlockReason(customer);
}

export function getBulkPermanentDeleteCustomerBlockReason(
  customer: Pick<Customer, "deletedAt">,
  dependencies: CustomerDeleteDependencies,
): string | null {
  return getPermanentDeleteCustomerBlockReason(customer, dependencies);
}

export function formatBulkCustomersResultMessage(input: {
  successCount: number;
  failureCount: number;
  actionLabel: string;
}): string {
  const { successCount, failureCount, actionLabel } = input;

  if (successCount === 0 && failureCount === 0) {
    return "No customers were updated.";
  }

  if (failureCount === 0) {
    return `${actionLabel} applied to ${successCount} customer${
      successCount === 1 ? "" : "s"
    }.`;
  }

  if (successCount === 0) {
    return `${failureCount} customer${failureCount === 1 ? "" : "s"} could not be updated.`;
  }

  return `${actionLabel} applied to ${successCount} customer${
    successCount === 1 ? "" : "s"
  }. ${failureCount} could not be updated.`;
}

export function isBulkCustomerActionDestructive(
  actionId: CustomerLifecycleActionId,
): boolean {
  return actionId === "permanentDelete";
}

export function resolveBulkCustomerLifecycleActions(
  lifecycleFilter: "active" | "archived" | "deleted",
): CustomerLifecycleActionId[] {
  if (lifecycleFilter === "archived") {
    return ["restore", "moveToTrash"];
  }

  if (lifecycleFilter === "deleted") {
    return ["restoreFromTrash", "permanentDelete"];
  }

  return ["archive", "moveToTrash"];
}
