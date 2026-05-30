export type ServiceItem = {
  id: string;
  name: string;
  description?: string;
  unitCost?: number;
  unitPrice: number;
  taxable: boolean;
  category?: string;
  isActive: boolean;
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

export function filterActiveServiceItemsForSearch(
  serviceItems: ServiceItem[],
  search: string,
): ServiceItem[] {
  const query = search.trim().toLowerCase();

  if (!query) {
    return serviceItems;
  }

  return serviceItems.filter((item) => {
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
