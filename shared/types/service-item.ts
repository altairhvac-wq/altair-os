import { isServiceItemVisibleInPickers } from "@/shared/lib/service-item-lifecycle";

export type ServiceItem = {
  id: string;
  name: string;
  description?: string;
  unitCost?: number;
  unitPrice: number;
  taxable: boolean;
  category?: string;
  isActive: boolean;
  archivedAt?: string;
  deletedAt?: string;
  deleteAfter?: string;
};

export type ServiceItemFormData = {
  name: string;
  description: string;
  unitCost?: number | null;
  unitPrice: number;
  taxable: boolean;
  category: string;
  isActive: boolean;
};

export type ServiceItemLifecycleState = "active" | "archived" | "deleted";

export const SERVICE_ITEM_LIFECYCLE_FILTER_OPTIONS: {
  value: ServiceItemLifecycleState;
  label: string;
}[] = [
  { value: "active", label: "Active items" },
  { value: "archived", label: "Archived" },
  { value: "deleted", label: "Recently Deleted" },
];

export function filterActiveServiceItemsForSearch(
  serviceItems: ServiceItem[],
  search: string,
): ServiceItem[] {
  const visibleItems = serviceItems.filter(isServiceItemVisibleInPickers);
  const query = search.trim().toLowerCase();

  if (!query) {
    return visibleItems;
  }

  return visibleItems.filter((item) => {
    const haystack = [item.name, item.description, item.category]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return haystack.includes(query);
  });
}

export const SERVICE_ITEM_STATUS_OPTIONS: {
  value: "all" | "active" | "inactive";
  label: string;
}[] = [
  { value: "all", label: "All items" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];
