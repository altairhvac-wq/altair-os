import { mapDatabaseError } from "@/lib/database/errors";
import type { InvoiceStatus } from "@/shared/types/invoice";
import type { PaymentSource } from "./types";

const SUPPORTED_PAYMENT_SOURCES: readonly PaymentSource[] = ["manual"];

const RECORD_INVOICE_PAYMENT_RPC_EXCEPTION_CODES = [
  "insufficient_permission",
  "invoice_not_found",
  "invoice_not_payable",
  "payment_amount_invalid",
  "payment_exceeds_balance",
  "invoice_concurrency_conflict",
  "duplicate_payment_idempotency_key",
] as const;

type RecordInvoicePaymentRpcExceptionCode =
  (typeof RECORD_INVOICE_PAYMENT_RPC_EXCEPTION_CODES)[number];

export type RecordInvoicePaymentRpcResult = {
  payment_id: string;
  invoice_id: string;
  previous_status: InvoiceStatus;
  new_status: InvoiceStatus;
  amount_paid: number;
  balance_due: number;
  paid_at: string | null;
};

export function normalizeManualPaymentSource(source: string): PaymentSource {
  if (source === "manual") {
    return "manual";
  }

  throw new Error(`Unsupported payment source: ${source}`);
}

export function assertSupportedPaymentSource(
  source: PaymentSource,
): asserts source is PaymentSource {
  if (!SUPPORTED_PAYMENT_SOURCES.includes(source)) {
    throw new Error(`Unsupported payment source: ${source}`);
  }
}

function extractRecordInvoicePaymentRpcExceptionCode(
  message: string,
): RecordInvoicePaymentRpcExceptionCode | null {
  const trimmed = message.trim();

  for (const code of RECORD_INVOICE_PAYMENT_RPC_EXCEPTION_CODES) {
    if (trimmed === code || trimmed.includes(code)) {
      return code;
    }
  }

  return null;
}

export function mapRecordInvoicePaymentRpcError(error: {
  message?: string;
  code?: string;
}): string {
  const rawMessage = error.message?.trim() ?? "";
  const exceptionCode = extractRecordInvoicePaymentRpcExceptionCode(rawMessage);

  switch (exceptionCode) {
    case "insufficient_permission":
      return "You do not have permission to record payments.";
    case "invoice_not_found":
      return "Invoice not found.";
    case "invoice_not_payable":
      return "This invoice cannot accept payments in its current status.";
    case "payment_amount_invalid":
      return "Payment amount must be greater than zero.";
    case "payment_exceeds_balance":
      return "Payment amount cannot exceed the balance due.";
    case "invoice_concurrency_conflict":
      return "Invoice balance changed while recording this payment. Refresh the page and try again.";
    case "duplicate_payment_idempotency_key":
      return "This payment was already recorded.";
    default:
      return mapDatabaseError(error);
  }
}

export function parseRecordInvoicePaymentRpcResult(
  data: unknown,
): RecordInvoicePaymentRpcResult | null {
  if (!data || typeof data !== "object") {
    return null;
  }

  const row = data as Record<string, unknown>;

  if (
    typeof row.payment_id !== "string" ||
    typeof row.invoice_id !== "string" ||
    typeof row.previous_status !== "string" ||
    typeof row.new_status !== "string" ||
    row.amount_paid === undefined ||
    row.balance_due === undefined
  ) {
    return null;
  }

  return {
    payment_id: row.payment_id,
    invoice_id: row.invoice_id,
    previous_status: row.previous_status as InvoiceStatus,
    new_status: row.new_status as InvoiceStatus,
    amount_paid: Number(row.amount_paid) || 0,
    balance_due: Number(row.balance_due) || 0,
    paid_at:
      row.paid_at === null || row.paid_at === undefined
        ? null
        : String(row.paid_at),
  };
}
