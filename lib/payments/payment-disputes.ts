/**
 * Payment dispute domain types (DB row shape).
 * Separate from invoice_payments (success-only ledger). Populated by
 * charge.dispute.* webhooks — see lib/payments/payment-disputes-service.ts.
 * Dashboard Payments bucket uses isOpenPaymentDisputeStatus.
 */

import type { Timestamp, UUID } from "@/lib/database/types/enums";

export type PaymentDisputeProvider = "stripe";

/** Stripe Dispute.status values (API Dispute object). */
export type PaymentDisputeStatus =
  | "warning_needs_response"
  | "warning_under_review"
  | "warning_closed"
  | "needs_response"
  | "under_review"
  | "won"
  | "lost"
  | "prevented";

export const PAYMENT_DISPUTE_STATUSES: readonly PaymentDisputeStatus[] = [
  "warning_needs_response",
  "warning_under_review",
  "warning_closed",
  "needs_response",
  "under_review",
  "won",
  "lost",
  "prevented",
] as const;

export type PaymentDisputeRecord = {
  id: UUID;
  company_id: UUID;
  invoice_id: UUID | null;
  invoice_payment_id: UUID | null;
  payment_attempt_id: UUID | null;
  provider: PaymentDisputeProvider;
  provider_dispute_id: string;
  provider_charge_id: string | null;
  provider_payment_intent_id: string | null;
  connected_account_id: string;
  amount: number;
  currency: string;
  reason: string | null;
  status: PaymentDisputeStatus;
  evidence_due_by: Timestamp | null;
  provider_created_at: Timestamp | null;
  created_at: Timestamp;
  updated_at: Timestamp;
};

export type PaymentDisputeRecordInsert = {
  id?: UUID;
  company_id: UUID;
  invoice_id?: UUID | null;
  invoice_payment_id?: UUID | null;
  payment_attempt_id?: UUID | null;
  provider?: PaymentDisputeProvider;
  provider_dispute_id: string;
  provider_charge_id?: string | null;
  provider_payment_intent_id?: string | null;
  connected_account_id: string;
  amount: number;
  currency?: string;
  reason?: string | null;
  status: PaymentDisputeStatus;
  evidence_due_by?: Timestamp | null;
  provider_created_at?: Timestamp | null;
  created_at?: Timestamp;
  updated_at?: Timestamp;
};

export function isPaymentDisputeStatus(
  value: string,
): value is PaymentDisputeStatus {
  return (PAYMENT_DISPUTE_STATUSES as readonly string[]).includes(value);
}

/** Statuses that still need owner attention (response or review in progress). */
export function isOpenPaymentDisputeStatus(
  status: PaymentDisputeStatus,
): boolean {
  return (
    status === "needs_response" ||
    status === "warning_needs_response" ||
    status === "under_review" ||
    status === "warning_under_review"
  );
}
