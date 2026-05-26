export type InvoiceStatus =
  | "draft"
  | "sent"
  | "partially_paid"
  | "paid"
  | "overdue"
  | "void"
  | "cancelled";

export type InvoiceLineItem = {
  id: string;
  serviceItemId?: string;
  name: string;
  description?: string;
  quantity: number;
  unitPrice: number;
  taxable: boolean;
  lineTotal: number;
};

export type Invoice = {
  id: string;
  invoiceNumber: string;
  customerId: string;
  customerName: string;
  jobId?: string;
  jobNumber?: string;
  estimateId?: string;
  estimateNumber?: string;
  status: InvoiceStatus;
  lineItems: InvoiceLineItem[];
  lineItemCount?: number;
  subtotal: number;
  taxRate: number;
  taxAmount?: number;
  total: number;
  amountPaid: number;
  balanceDue: number;
  issueDate: string;
  dueDate: string;
  paidAt?: string;
  notes?: string;
  createdAt: string;
};

export type InvoiceDetail = Invoice & {
  customerEmail?: string;
  customerPhone?: string;
};

export type InvoiceLineItemFormData = {
  serviceItemId?: string;
  name: string;
  description: string;
  quantity: number;
  unitPrice: number;
  taxable: boolean;
};

export type InvoiceFormData = {
  customerId: string;
  jobId?: string;
  estimateId?: string;
  status: InvoiceStatus;
  issueDate: string;
  dueDate: string;
  notes: string;
  taxRate: number;
  lineItems: InvoiceLineItemFormData[];
};

export const INVOICE_STATUS_OPTIONS: {
  value: InvoiceStatus | "all";
  label: string;
}[] = [
  { value: "all", label: "All statuses" },
  { value: "draft", label: "Draft" },
  { value: "sent", label: "Sent" },
  { value: "partially_paid", label: "Partially paid" },
  { value: "paid", label: "Paid" },
  { value: "overdue", label: "Overdue" },
  { value: "void", label: "Void" },
  { value: "cancelled", label: "Cancelled" },
];

export const INVOICE_DUE_DAYS = 30;

export function calculateLineItemTotal(
  quantity: number,
  unitPrice: number,
): number {
  return roundCurrency(quantity * unitPrice);
}

export function calculateInvoiceSubtotal(
  lineItems: Pick<InvoiceLineItem, "quantity" | "unitPrice">[],
): number {
  return roundCurrency(
    lineItems.reduce(
      (sum, item) => sum + calculateLineItemTotal(item.quantity, item.unitPrice),
      0,
    ),
  );
}

export function calculateTaxableSubtotal(
  lineItems: Pick<InvoiceLineItem, "quantity" | "unitPrice" | "taxable">[],
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

export function calculateInvoiceTotals(
  lineItems: Pick<InvoiceLineItem, "quantity" | "unitPrice" | "taxable">[],
  taxRate: number,
): {
  subtotal: number;
  taxableSubtotal: number;
  taxAmount: number;
  total: number;
} {
  const subtotal = calculateInvoiceSubtotal(lineItems);
  const taxableSubtotal = calculateTaxableSubtotal(lineItems);
  const taxAmount = calculateTaxAmount(taxableSubtotal, taxRate);
  const total = roundCurrency(subtotal + taxAmount);

  return { subtotal, taxableSubtotal, taxAmount, total };
}

export function getDefaultIssueDate(fromDate: Date = new Date()): string {
  return fromDate.toISOString().split("T")[0] ?? "";
}

export function getDefaultDueDate(fromDate: Date = new Date()): string {
  const date = new Date(fromDate);
  date.setDate(date.getDate() + INVOICE_DUE_DAYS);
  return date.toISOString().split("T")[0] ?? "";
}

export function resolveDueDate(issueDate: string, dueDate: string): string {
  const trimmedDueDate = dueDate.trim();
  if (trimmedDueDate) {
    return trimmedDueDate;
  }

  const parsedIssueDate = issueDate.trim()
    ? new Date(`${issueDate.trim()}T00:00:00`)
    : new Date();

  return getDefaultDueDate(parsedIssueDate);
}

export function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100;
}

export function formatInvoiceStatus(status: InvoiceStatus): string {
  return (
    INVOICE_STATUS_OPTIONS.find((option) => option.value === status)?.label ??
    status
  );
}

export function formatTaxRate(taxRate: number): string {
  const normalized = roundCurrency(Math.max(taxRate, 0));
  return Number.isInteger(normalized)
    ? String(normalized)
    : normalized.toFixed(2).replace(/\.?0+$/, "");
}

export function isActiveInvoice(invoice: Pick<Invoice, "status">): boolean {
  return invoice.status !== "void" && invoice.status !== "cancelled";
}

/** Matches dashboard money snapshot and summary-card unpaid totals. */
export function hasInvoiceUnpaidBalance(
  invoice: Pick<Invoice, "status" | "balanceDue">,
): boolean {
  return (
    isActiveInvoice(invoice) &&
    invoice.status !== "paid" &&
    invoice.balanceDue > 0
  );
}

export function getInvoiceSummary(invoices: Invoice[]) {
  const active = invoices.filter(isActiveInvoice);

  const unpaidTotal = active
    .filter(hasInvoiceUnpaidBalance)
    .reduce((sum, inv) => sum + inv.balanceDue, 0);

  const paidTotal = active
    .filter((inv) => inv.status === "paid")
    .reduce((sum, inv) => sum + inv.total, 0);

  const overdueTotal = active
    .filter((inv) => inv.status === "overdue")
    .reduce((sum, inv) => sum + inv.balanceDue, 0);

  return { unpaidTotal, paidTotal, overdueTotal };
}
