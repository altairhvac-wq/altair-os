import { getServiceItemLifecycleState } from "@/shared/lib/service-item-lifecycle";
import type { ServiceItem } from "@/shared/types/service-item";

export type ServiceItemWorkQueue =
  | "active"
  | "needs-cleanup"
  | "inactive"
  | "past";

export const SERVICE_ITEM_WORK_QUEUE_ORDER: readonly ServiceItemWorkQueue[] = [
  "active",
  "needs-cleanup",
  "inactive",
  "past",
];

export const SERVICE_ITEM_WORK_QUEUE_LABELS: Record<
  ServiceItemWorkQueue,
  string
> = {
  active: "Active",
  "needs-cleanup": "Needs cleanup",
  inactive: "Inactive",
  past: "Past",
};

export function isServiceItemMissingPricingInfo(
  item: Pick<ServiceItem, "unitCost" | "unitPrice" | "category">,
): boolean {
  if (item.unitCost == null) {
    return true;
  }

  if (item.unitPrice <= 0) {
    return true;
  }

  if (!item.category?.trim()) {
    return true;
  }

  return false;
}

/** Archived, deleted, and other removed catalog records. */
export function isServiceItemPastQueue(
  item: Pick<ServiceItem, "archivedAt" | "deletedAt">,
): boolean {
  const lifecycle = getServiceItemLifecycleState(item);
  return lifecycle === "archived" || lifecycle === "deleted";
}

/** Active lifecycle items hidden from pickers. */
export function isServiceItemInactiveQueue(
  item: Pick<ServiceItem, "archivedAt" | "deletedAt" | "isActive">,
): boolean {
  return (
    getServiceItemLifecycleState(item) === "active" && !item.isActive
  );
}

/** Active sellable items missing price, cost, category, or other pricing info. */
export function isServiceItemNeedsCleanupQueue(item: ServiceItem): boolean {
  if (getServiceItemLifecycleState(item) !== "active" || !item.isActive) {
    return false;
  }

  return isServiceItemMissingPricingInfo(item);
}

/** Active sellable service items ready for estimates and invoices. */
export function isServiceItemActiveQueue(
  item: Pick<ServiceItem, "archivedAt" | "deletedAt" | "isActive">,
): boolean {
  return getServiceItemLifecycleState(item) === "active" && item.isActive;
}

export function filterServiceItemsForWorkQueue(
  serviceItems: ServiceItem[],
  queue: ServiceItemWorkQueue,
): ServiceItem[] {
  const predicate = {
    active: isServiceItemActiveQueue,
    "needs-cleanup": isServiceItemNeedsCleanupQueue,
    inactive: isServiceItemInactiveQueue,
    past: isServiceItemPastQueue,
  }[queue];

  return serviceItems.filter(predicate);
}

export function countServiceItemsForWorkQueue(
  serviceItems: ServiceItem[],
  queue: ServiceItemWorkQueue,
): number {
  return filterServiceItemsForWorkQueue(serviceItems, queue).length;
}

function compareServiceItemName(left: ServiceItem, right: ServiceItem): number {
  return left.name.localeCompare(right.name);
}

export function sortServiceItemsForWorkQueue(
  serviceItems: ServiceItem[],
  queue: ServiceItemWorkQueue,
): ServiceItem[] {
  const sorted = [...serviceItems];

  if (queue === "needs-cleanup" || queue === "past") {
    return sorted.sort(compareServiceItemName);
  }

  return sorted;
}
