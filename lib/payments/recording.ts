import { mapDatabaseError } from "@/lib/database/errors";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database/types";
import type { Json } from "@/lib/database/types/enums";
import type { InvoiceStatus } from "@/shared/types/invoice";
import type { StripeCheckoutProviderMetadata } from "./stripe-checkout";
import type { PaymentSource } from "./types";

const SUPPORTED_MANUAL_PAYMENT_SOURCES: readonly PaymentSource[] = ["manual"];

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
): asserts source is "manual" {
  if (!SUPPORTED_MANUAL_PAYMENT_SOURCES.includes(source)) {
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

export type RecordStripeCheckoutPaymentInput = {
  companyId: string;
  invoiceId: string;
  amount: number;
  paymentDate: string;
  checkoutSessionId: string;
  providerPaymentId: string | null;
  idempotencyKey: string;
  providerMetadata: StripeCheckoutProviderMetadata;
};

export function isDuplicateStripePaymentRpcError(error: {
  message?: string;
}): boolean {
  const rawMessage = error.message?.trim() ?? "";
  return extractRecordInvoicePaymentRpcExceptionCode(rawMessage) ===
    "duplicate_payment_idempotency_key";
}

export async function recordStripeCheckoutPaymentAtomic(
  supabase: SupabaseClient<Database>,
  input: RecordStripeCheckoutPaymentInput,
): Promise<
  | { ok: true; result: RecordInvoicePaymentRpcResult }
  | { ok: false; error: string; duplicate: boolean }
> {
  const { data, error } = await supabase.rpc("record_invoice_payment_atomic", {
    p_company_id: input.companyId,
    p_invoice_id: input.invoiceId,
    p_amount: input.amount,
    p_payment_method: "card",
    p_payment_date: input.paymentDate,
    p_reference: null,
    p_notes: null,
    p_expected_updated_at: null,
    p_idempotency_key: input.idempotencyKey,
    p_source: "stripe",
    p_provider: "stripe",
    p_provider_checkout_session_id: input.checkoutSessionId,
    p_provider_payment_id: input.providerPaymentId,
    p_provider_metadata: input.providerMetadata as Json,
  });

  if (error) {
    const duplicate = isDuplicateStripePaymentRpcError(error);
    return {
      ok: false,
      error: mapRecordInvoicePaymentRpcError(error),
      duplicate,
    };
  }

  const result = parseRecordInvoicePaymentRpcResult(data);

  if (!result) {
    return {
      ok: false,
      error: "Failed to record Stripe checkout payment.",
      duplicate: false,
    };
  }

  return { ok: true, result };
}
