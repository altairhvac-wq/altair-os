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

export function roundJobMaterialAmount(value: number): number {
  return Math.round(value * 100) / 100;
}

export function formatJobMaterialQuantity(quantity: number): string {
  if (!Number.isFinite(quantity)) {
    return "—";
  }

  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(quantity);
}

export function formatJobMaterialCurrency(amount: number): string {
  if (!Number.isFinite(amount)) {
    return "—";
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

export function formatJobMaterialCreatedAt(isoDate: string): string {
  const date = new Date(isoDate);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export function calculateJobMaterialTotalCost(
  material: Pick<JobMaterial, "quantity" | "unitCost">,
): number | undefined {
  if (material.unitCost == null) {
    return undefined;
  }

  return roundJobMaterialAmount(material.quantity * material.unitCost);
}

export function calculateJobMaterialTotalBillable(
  material: Pick<JobMaterial, "quantity" | "unitPrice">,
): number {
  return roundJobMaterialAmount(material.quantity * material.unitPrice);
}
