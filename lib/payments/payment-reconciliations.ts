/**
 * Payment reconciliation domain types (DB row shape).
 * A row exists only when Stripe conclusively captured funds for a Checkout Session that
 * could no longer be safely applied as a normal invoice payment (stale Payment Attempt,
 * non-payable invoice, or an amount/balance conflict). See
 * supabase/migrations/113_payment_reconciliations.sql and
 * lib/payments/payment-reconciliation-service.ts for the runtime logic.
 */

import type { Timestamp, UUID } from "@/lib/database/types/enums";

export type PaymentReconciliationProvider = "stripe";

export type PaymentReconciliationReasonCode =
  | "attempt_invalidated"
  | "invoice_not_payable"
  | "amount_mismatch"
  | "balance_conflict";

export type PaymentReconciliationStatus = "requires_review";

export type PaymentReconciliationRecord = {
  id: UUID;
  company_id: UUID;
  invoice_id: UUID;
  payment_attempt_id: UUID;
  provider_event_id: UUID;
  provider: PaymentReconciliationProvider;
  provider_checkout_session_id: string;
  provider_payment_id: string | null;
  captured_amount: number;
  currency: string;
  reason_code: PaymentReconciliationReasonCode;
  status: PaymentReconciliationStatus;
  created_at: Timestamp;
};

export type PaymentReconciliationRecordInsert = {
  id?: UUID;
  company_id: UUID;
  invoice_id: UUID;
  payment_attempt_id: UUID;
  provider_event_id: UUID;
  provider?: PaymentReconciliationProvider;
  provider_checkout_session_id: string;
  provider_payment_id?: string | null;
  captured_amount: number;
  currency?: string;
  reason_code: PaymentReconciliationReasonCode;
  status?: PaymentReconciliationStatus;
  created_at?: Timestamp;
};
