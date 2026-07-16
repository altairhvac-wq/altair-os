import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database/types";
import { mapDatabaseError } from "@/lib/database/errors";
import type { PaymentReconciliationReasonCode } from "./payment-reconciliations";

export type RecordPaymentReconciliationInput = {
  companyId: string;
  invoiceId: string;
  paymentAttemptId: string;
  /** Internal primary key of the payment_provider_events row, not Stripe's event id. */
  providerEventId: string;
  checkoutSessionId: string;
  providerPaymentId: string | null;
  capturedAmount: number;
  currency: string;
  reasonCode: PaymentReconciliationReasonCode;
};

export type RecordPaymentReconciliationRpcResult = {
  reconciliation_id: string;
  invoice_id: string;
  payment_attempt_id: string;
  status: "requires_review";
  created: boolean;
};

function parseRecordPaymentReconciliationRpcResult(
  data: unknown,
): RecordPaymentReconciliationRpcResult | null {
  if (!data || typeof data !== "object") {
    return null;
  }

  const row = data as Record<string, unknown>;

  if (
    typeof row.reconciliation_id !== "string" ||
    typeof row.invoice_id !== "string" ||
    typeof row.payment_attempt_id !== "string" ||
    typeof row.status !== "string" ||
    typeof row.created !== "boolean"
  ) {
    return null;
  }

  return {
    reconciliation_id: row.reconciliation_id,
    invoice_id: row.invoice_id,
    payment_attempt_id: row.payment_attempt_id,
    status: "requires_review",
    created: row.created,
  };
}

/**
 * Atomically records a durable requires_review reconciliation for a captured-but-stale
 * Stripe Checkout Session and flips the owning provider event to reconciliation_required.
 * See supabase/migrations/113_payment_reconciliations.sql. service_role only.
 */
export async function recordPaymentReconciliationAtomic(
  supabase: SupabaseClient<Database>,
  input: RecordPaymentReconciliationInput,
): Promise<
  | { ok: true; result: RecordPaymentReconciliationRpcResult }
  | { ok: false; error: string }
> {
  const { data, error } = await supabase.rpc(
    "record_payment_reconciliation_atomic",
    {
      p_company_id: input.companyId,
      p_invoice_id: input.invoiceId,
      p_payment_attempt_id: input.paymentAttemptId,
      p_provider_event_id: input.providerEventId,
      p_provider_checkout_session_id: input.checkoutSessionId,
      p_captured_amount: input.capturedAmount,
      p_reason_code: input.reasonCode,
      p_provider: "stripe",
      p_provider_payment_id: input.providerPaymentId,
      p_currency: input.currency,
    },
  );

  if (error) {
    return { ok: false, error: mapDatabaseError(error) };
  }

  const result = parseRecordPaymentReconciliationRpcResult(data);

  if (!result) {
    return { ok: false, error: "Failed to record payment reconciliation." };
  }

  return { ok: true, result };
}
