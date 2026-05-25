export type ServiceItem = {
  id: string;
  name: string;
  description?: string;
  unitPrice: number;
  taxable: boolean;
  category?: string;
  isActive: boolean;
};

export type ServiceItemFormData = {
  name: string;
  description: string;
  unitPrice: number;
  taxable: boolean;
  category: string;
  isActive: boolean;
};

export const SERVICE_ITEM_STATUS_OPTIONS: {
  value: "all" | "active" | "inactive";
  label: string;
}[] = [
  { value: "all", label: "All items" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];
