export type InvoiceStatus =
  | "draft"
  | "sent"
  | "viewed"
  | "partially_paid"
  | "paid"
  | "overdue"
  | "void";

export type InvoiceLineItem = {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
};

export type Invoice = {
  id: string;
  invoiceNumber: string;
  customerId: string;
  customerName: string;
  jobId?: string;
  jobNumber?: string;
  jobType: string;
  status: InvoiceStatus;
  lineItems: InvoiceLineItem[];
  subtotal: number;
  tax?: number;
  total: number;
  amountPaid: number;
  balanceDue: number;
  issuedAt: string;
  dueDate: string;
  paidAt?: string;
  notes?: string;
  createdAt: string;
};

export type InvoiceLineItemFormData = {
  description: string;
  quantity: number;
  unitPrice: number;
};

export type InvoiceFormData = {
  customerName: string;
  jobType: string;
  status: InvoiceStatus;
  dueDate: string;
  tax: number;
  notes: string;
  lineItems: InvoiceLineItemFormData[];
};

export const INVOICE_STATUS_OPTIONS: {
  value: InvoiceStatus | "all";
  label: string;
}[] = [
  { value: "all", label: "All statuses" },
  { value: "draft", label: "Draft" },
  { value: "sent", label: "Sent" },
  { value: "viewed", label: "Viewed" },
  { value: "partially_paid", label: "Partially paid" },
  { value: "paid", label: "Paid" },
  { value: "overdue", label: "Overdue" },
  { value: "void", label: "Void" },
];

export function calculateLineItemTotal(
  quantity: number,
  unitPrice: number,
): number {
  return quantity * unitPrice;
}

export function calculateInvoiceSubtotal(
  lineItems: Pick<InvoiceLineItem, "quantity" | "unitPrice">[],
): number {
  return lineItems.reduce(
    (sum, item) => sum + calculateLineItemTotal(item.quantity, item.unitPrice),
    0,
  );
}

export function calculateInvoiceTotal(
  lineItems: Pick<InvoiceLineItem, "quantity" | "unitPrice">[],
  tax = 0,
): number {
  return calculateInvoiceSubtotal(lineItems) + tax;
}

export function formatInvoiceStatus(status: InvoiceStatus): string {
  return INVOICE_STATUS_OPTIONS.find((option) => option.value === status)
    ?.label ?? status;
}

export function getInvoiceSummary(invoices: Invoice[]) {
  const active = invoices.filter((inv) => inv.status !== "void");

  const unpaidTotal = active
    .filter((inv) => inv.status !== "paid" && inv.balanceDue > 0)
    .reduce((sum, inv) => sum + inv.balanceDue, 0);

  const paidTotal = active
    .filter((inv) => inv.status === "paid")
    .reduce((sum, inv) => sum + inv.total, 0);

  const overdueTotal = active
    .filter((inv) => inv.status === "overdue")
    .reduce((sum, inv) => sum + inv.balanceDue, 0);

  return { unpaidTotal, paidTotal, overdueTotal };
}
