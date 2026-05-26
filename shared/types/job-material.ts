export type JobMaterial = {
  id: string;
  companyId: string;
  customerId?: string;
  jobId: string;
  serviceItemId?: string;
  name: string;
  description?: string;
  quantity: number;
  unitCost?: number;
  unitPrice: number;
  taxable: boolean;
  addedBy?: string;
  addedByName?: string;
  createdAt: string;
  updatedAt: string;
};

export type JobMaterialFormData = {
  jobId: string;
  serviceItemId?: string;
  name: string;
  description?: string;
  quantity: number;
  unitCost?: number | null;
  unitPrice: number;
  taxable: boolean;
};

export function formatJobMaterialQuantity(quantity: number): string {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(quantity);
}

export function formatJobMaterialCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}
