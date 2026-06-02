import type { ServiceItem } from "@/shared/types/service-item";

export type ServiceItemDeleteDependencies = {
  estimateLineItemCount: number;
  invoiceLineItemCount: number;
  jobMaterialCount: number;
};

export type ServiceItemLifecycleActionId =
  | "archive"
  | "restore"
  | "moveToTrash"
  | "restoreFromTrash"
  | "permanentDelete";

export type ServiceItemLifecycleState = "active" | "archived" | "deleted";

export const SERVICE_ITEM_USAGE_BLOCKED_MESSAGE =
  "This service item is used on estimates, invoices, or jobs and cannot be permanently deleted. Keep it archived.";

export function isServiceItemDeleted(
  item: Pick<ServiceItem, "deletedAt">,
): boolean {
  return Boolean(item.deletedAt);
}

export function isServiceItemArchived(
  item: Pick<ServiceItem, "archivedAt">,
): boolean {
  return Boolean(item.archivedAt);
}

export function isServiceItemVisibleInPickers(
  item: Pick<ServiceItem, "archivedAt" | "deletedAt" | "isActive">,
): boolean {
  return (
    item.isActive &&
    !isServiceItemArchived(item) &&
    !isServiceItemDeleted(item)
  );
}

export function getServiceItemLifecycleState(
  item: Pick<ServiceItem, "archivedAt" | "deletedAt">,
): ServiceItemLifecycleState {
  if (isServiceItemDeleted(item)) return "deleted";
  if (isServiceItemArchived(item)) return "archived";
  return "active";
}

export function hasServiceItemUsage(
  dependencies: ServiceItemDeleteDependencies,
): boolean {
  return (
    dependencies.estimateLineItemCount > 0 ||
    dependencies.invoiceLineItemCount > 0 ||
    dependencies.jobMaterialCount > 0
  );
}

export function getArchiveServiceItemBlockReason(
  item: Pick<ServiceItem, "archivedAt" | "deletedAt">,
): string | null {
  if (isServiceItemDeleted(item)) {
    return "This item is in Recently Deleted. Restore it first.";
  }
  if (isServiceItemArchived(item)) {
    return "This item is already archived.";
  }
  return null;
}

export function canArchiveServiceItem(
  item: Pick<ServiceItem, "archivedAt" | "deletedAt">,
): boolean {
  return getArchiveServiceItemBlockReason(item) === null;
}

export function getRestoreServiceItemBlockReason(
  item: Pick<ServiceItem, "archivedAt" | "deletedAt">,
): string | null {
  if (isServiceItemDeleted(item)) {
    return "This item is in Recently Deleted. Use restore from Recently Deleted.";
  }
  if (!isServiceItemArchived(item)) {
    return "This item is not archived.";
  }
  return null;
}

export function canRestoreServiceItem(
  item: Pick<ServiceItem, "archivedAt" | "deletedAt">,
): boolean {
  return getRestoreServiceItemBlockReason(item) === null;
}

export function getMoveServiceItemToTrashBlockReason(
  item: Pick<ServiceItem, "deletedAt">,
  dependencies: ServiceItemDeleteDependencies,
): string | null {
  if (isServiceItemDeleted(item)) {
    return "This item is already in Recently Deleted.";
  }
  if (hasServiceItemUsage(dependencies)) {
    return "Archive this item instead. It is referenced on existing records.";
  }
  return null;
}

export function canMoveServiceItemToTrash(
  item: Pick<ServiceItem, "deletedAt">,
  dependencies: ServiceItemDeleteDependencies,
): boolean {
  return getMoveServiceItemToTrashBlockReason(item, dependencies) === null;
}

export function getRestoreServiceItemFromTrashBlockReason(
  item: Pick<ServiceItem, "deletedAt">,
): string | null {
  if (!isServiceItemDeleted(item)) {
    return "This item is not in Recently Deleted.";
  }
  return null;
}

export function canRestoreServiceItemFromTrash(
  item: Pick<ServiceItem, "deletedAt">,
): boolean {
  return getRestoreServiceItemFromTrashBlockReason(item) === null;
}

export function getPermanentDeleteServiceItemBlockReason(
  item: Pick<ServiceItem, "deletedAt">,
  dependencies: ServiceItemDeleteDependencies,
): string | null {
  if (!isServiceItemDeleted(item)) {
    return "Move this item to Recently Deleted before permanently deleting.";
  }
  if (hasServiceItemUsage(dependencies)) {
    return SERVICE_ITEM_USAGE_BLOCKED_MESSAGE;
  }
  return null;
}

export function canPermanentlyDeleteServiceItem(
  item: Pick<ServiceItem, "deletedAt">,
  dependencies: ServiceItemDeleteDependencies,
): boolean {
  return (
    getPermanentDeleteServiceItemBlockReason(item, dependencies) === null
  );
}

export function formatBulkServiceItemsResultMessage(input: {
  successCount: number;
  failureCount: number;
  actionLabel: string;
}): string {
  const { successCount, failureCount, actionLabel } = input;

  if (successCount === 0 && failureCount === 0) {
    return "No service items were updated.";
  }

  if (failureCount === 0) {
    return `${actionLabel} applied to ${successCount} item${
      successCount === 1 ? "" : "s"
    }.`;
  }

  if (successCount === 0) {
    return `${failureCount} item${failureCount === 1 ? "" : "s"} could not be updated.`;
  }

  return `${actionLabel} applied to ${successCount} item${
    successCount === 1 ? "" : "s"
  }. ${failureCount} could not be updated.`;
}

export function isBulkServiceItemActionDestructive(
  actionId: ServiceItemLifecycleActionId,
): boolean {
  return actionId === "permanentDelete";
}

export function resolveBulkServiceItemLifecycleActions(
  lifecycleFilter: ServiceItemLifecycleState,
): ServiceItemLifecycleActionId[] {
  if (lifecycleFilter === "archived") {
    return ["restore", "moveToTrash"];
  }
  if (lifecycleFilter === "deleted") {
    return ["restoreFromTrash", "permanentDelete"];
  }
  return ["archive", "moveToTrash"];
}
