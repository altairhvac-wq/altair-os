export type EstimateStatus =
  | "draft"
  | "sent"
  | "approved"
  | "declined"
  | "expired"
  | "converted";

export type EstimateLineItem = {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
};

export type Estimate = {
  id: string;
  estimateNumber: string;
  customerId: string;
  customerName: string;
  status: EstimateStatus;
  lineItems: EstimateLineItem[];
  subtotal: number;
  tax?: number;
  total: number;
  validUntil?: string;
  notes?: string;
  createdAt: string;
};

export type EstimateLineItemFormData = {
  description: string;
  quantity: number;
  unitPrice: number;
};

export type EstimateFormData = {
  customerName: string;
  status: EstimateStatus;
  validUntil: string;
  notes: string;
  lineItems: EstimateLineItemFormData[];
};

export const ESTIMATE_STATUS_OPTIONS: {
  value: EstimateStatus | "all";
  label: string;
}[] = [
  { value: "all", label: "All statuses" },
  { value: "draft", label: "Draft" },
  { value: "sent", label: "Sent" },
  { value: "approved", label: "Approved" },
  { value: "declined", label: "Declined" },
  { value: "expired", label: "Expired" },
  { value: "converted", label: "Converted" },
];

export function calculateLineItemTotal(
  quantity: number,
  unitPrice: number,
): number {
  return quantity * unitPrice;
}

export function calculateEstimateSubtotal(
  lineItems: Pick<EstimateLineItem, "quantity" | "unitPrice">[],
): number {
  return lineItems.reduce(
    (sum, item) => sum + calculateLineItemTotal(item.quantity, item.unitPrice),
    0,
  );
}

export function calculateEstimateTotal(
  lineItems: Pick<EstimateLineItem, "quantity" | "unitPrice">[],
  tax = 0,
): number {
  return calculateEstimateSubtotal(lineItems) + tax;
}

export function formatEstimateStatus(status: EstimateStatus): string {
  return status.charAt(0).toUpperCase() + status.slice(1);
}
