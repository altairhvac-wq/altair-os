export type PaymentMethod =
  | "cash"
  | "check"
  | "card"
  | "bank_transfer"
  | "other";

export type InvoicePayment = {
  id: string;
  invoiceId: string;
  amount: number;
  paymentMethod: PaymentMethod;
  paymentDate: string;
  reference?: string;
  notes?: string;
  recordedById?: string;
  recordedByName?: string;
  createdAt: string;
};

export type RecordPaymentFormData = {
  amount: number;
  paymentMethod: PaymentMethod;
  paymentDate: string;
  reference: string;
  notes: string;
};

export const PAYMENT_METHOD_OPTIONS: {
  value: PaymentMethod;
  label: string;
}[] = [
  { value: "cash", label: "Cash" },
  { value: "check", label: "Check" },
  { value: "card", label: "Card" },
  { value: "bank_transfer", label: "Bank transfer" },
  { value: "other", label: "Other" },
];

export function formatPaymentMethod(method: PaymentMethod): string {
  return (
    PAYMENT_METHOD_OPTIONS.find((option) => option.value === method)?.label ??
    method
  );
}

export function getDefaultPaymentDate(fromDate: Date = new Date()): string {
  return fromDate.toISOString().split("T")[0] ?? "";
}

export const PAYABLE_INVOICE_STATUSES = [
  "sent",
  "partially_paid",
  "overdue",
] as const;

export type PayableInvoiceStatus = (typeof PAYABLE_INVOICE_STATUSES)[number];

export function isInvoicePayable(status: string): status is PayableInvoiceStatus {
  return (PAYABLE_INVOICE_STATUSES as readonly string[]).includes(status);
}
