import {
  addDaysToDateOnly,
  getCompanyTimeZone,
  getDateOnlyInTimeZone,
} from "@/shared/lib/datetime";

export type EstimateStatus =
  | "draft"
  | "sent"
  | "approved"
  | "declined"
  | "converted"
  | "cancelled";

export type EstimateLineItem = {
  id: string;
  serviceItemId?: string;
  name: string;
  description?: string;
  quantity: number;
  unitPrice: number;
  taxable: boolean;
};

export type Estimate = {
  id: string;
  estimateNumber: string;
  customerId: string;
  customerName: string;
  jobId?: string;
  jobNumber?: string;
  status: EstimateStatus;
  lineItems: EstimateLineItem[];
  lineItemCount?: number;
  subtotal: number;
  taxRate: number;
  tax?: number;
  total: number;
  validUntil?: string;
  notes?: string;
  createdAt: string;
};

export type EstimateDetail = Estimate & {
  customerEmail?: string;
  customerPhone?: string;
};

export type EstimateLineItemFormData = {
  serviceItemId?: string;
  name: string;
  description: string;
  quantity: number;
  unitPrice: number;
  taxable: boolean;
};

export type EstimateFormData = {
  customerId: string;
  jobId?: string;
  status: EstimateStatus;
  validUntil: string;
  notes: string;
  taxRate: number;
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
  { value: "converted", label: "Converted" },
  { value: "cancelled", label: "Cancelled" },
];

export const ESTIMATE_VALIDITY_DAYS = 30;

export function calculateLineItemTotal(
  quantity: number,
  unitPrice: number,
): number {
  return roundCurrency(quantity * unitPrice);
}

export function calculateEstimateSubtotal(
  lineItems: Pick<EstimateLineItem, "quantity" | "unitPrice">[],
): number {
  return roundCurrency(
    lineItems.reduce(
      (sum, item) => sum + calculateLineItemTotal(item.quantity, item.unitPrice),
      0,
    ),
  );
}

export function calculateTaxableSubtotal(
  lineItems: Pick<EstimateLineItem, "quantity" | "unitPrice" | "taxable">[],
): number {
  return roundCurrency(
    lineItems.reduce((sum, item) => {
      if (!item.taxable) return sum;
      return sum + calculateLineItemTotal(item.quantity, item.unitPrice);
    }, 0),
  );
}

export function calculateTaxAmount(
  taxableSubtotal: number,
  taxRate: number,
): number {
  const normalizedRate = Math.max(taxRate, 0);
  return roundCurrency(taxableSubtotal * (normalizedRate / 100));
}

export function calculateEstimateTotals(
  lineItems: Pick<EstimateLineItem, "quantity" | "unitPrice" | "taxable">[],
  taxRate: number,
): { subtotal: number; taxableSubtotal: number; tax: number; total: number } {
  const subtotal = calculateEstimateSubtotal(lineItems);
  const taxableSubtotal = calculateTaxableSubtotal(lineItems);
  const tax = calculateTaxAmount(taxableSubtotal, taxRate);
  const total = roundCurrency(subtotal + tax);

  return { subtotal, taxableSubtotal, tax, total };
}

export function calculateEstimateTotal(
  lineItems: Pick<EstimateLineItem, "quantity" | "unitPrice" | "taxable">[],
  taxRate = 0,
): number {
  return calculateEstimateTotals(lineItems, taxRate).total;
}

export function getDefaultValidUntilDate(
  fromDate: Date = new Date(),
  timeZone: string = getCompanyTimeZone(),
): string {
  const startDateOnly = getDateOnlyInTimeZone(fromDate, timeZone);
  return addDaysToDateOnly(startDateOnly, ESTIMATE_VALIDITY_DAYS, timeZone);
}

export function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100;
}

export function formatEstimateStatus(status: EstimateStatus): string {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

/** Sent estimates can be emailed again without changing status. */
export function canResendEstimateEmail(status: EstimateStatus): boolean {
  return status === "sent";
}

export function formatTaxRate(taxRate: number): string {
  const normalized = roundCurrency(Math.max(taxRate, 0));
  return Number.isInteger(normalized)
    ? String(normalized)
    : normalized.toFixed(2).replace(/\.?0+$/, "");
}
