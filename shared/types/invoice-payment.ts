import { getCompanyTimeZone, getDateOnlyInTimeZone } from "@/shared/lib/datetime";
import type {
  PaymentProvider,
  PaymentRecordStatus,
  PaymentSource,
} from "@/lib/payments/types";

export type { PaymentProvider, PaymentRecordStatus, PaymentSource };

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
  source?: PaymentSource;
  provider?: PaymentProvider | null;
  providerPaymentId?: string | null;
  providerCheckoutSessionId?: string | null;
  idempotencyKey?: string | null;
  status?: PaymentRecordStatus;
  feeAmount?: number | null;
  netAmount?: number | null;
  providerMetadata?: Record<string, unknown>;
};

export type RecordPaymentFormData = {
  amount: number;
  paymentMethod: PaymentMethod;
  paymentDate: string;
  reference: string;
  notes: string;
  expectedUpdatedAt?: string;
  idempotencyKey?: string;
};

export const PAYMENT_METHOD_OPTIONS: {
  value: PaymentMethod;
  label: string;
}[] = [
  { value: "cash", label: "Cash" },
  { value: "check", label: "Check" },
  { value: "card", label: "Card" },
  { value: "bank_transfer", label: "ACH" },
  { value: "other", label: "Other" },
];

export function formatPaymentMethod(method: PaymentMethod): string {
  return (
    PAYMENT_METHOD_OPTIONS.find((option) => option.value === method)?.label ??
    method
  );
}

export function getDefaultPaymentDate(
  fromDate: Date = new Date(),
  timeZone: string = getCompanyTimeZone(),
): string {
  return getDateOnlyInTimeZone(fromDate, timeZone);
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

export function canRecordInvoicePayment(invoice: {
  status: string;
  balanceDue: number;
}): boolean {
  return isInvoicePayable(invoice.status) && invoice.balanceDue > 0;
}

export function getRecordPaymentBlockReason(invoice: {
  status: string;
  balanceDue: number;
}): string | null {
  if (invoice.balanceDue <= 0) {
    return "This invoice has no balance due.";
  }

  if (!isInvoicePayable(invoice.status)) {
    if (invoice.status === "draft") {
      return "Send this invoice before recording payments.";
    }

    if (invoice.status === "paid") {
      return "This invoice is fully paid.";
    }

    return "This invoice cannot accept payments in its current status.";
  }

  return null;
}
