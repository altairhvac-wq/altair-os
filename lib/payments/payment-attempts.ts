/**
 * Payment attempt domain types (DB row shape).
 * One row per Stripe Checkout attempt for an invoice; see
 * supabase/migrations/112_payment_attempts.sql and
 * lib/payments/payment-attempts-service.ts for the runtime logic.
 */

import type { Timestamp, UUID } from "@/lib/database/types/enums";

export type PaymentAttemptProvider = "stripe";

export type PaymentAttemptStatus =
  | "active"
  | "completed"
  | "expired"
  | "invalidated"
  | "failed";

export type PaymentAttemptRecord = {
  id: UUID;
  company_id: UUID;
  invoice_id: UUID;
  status: PaymentAttemptStatus;
  amount: number;
  currency: string;
  provider: PaymentAttemptProvider;
  provider_account_id: string | null;
  stripe_checkout_session_id: string | null;
  stripe_payment_intent_id: string | null;
  expires_at: Timestamp;
  completed_at: Timestamp | null;
  invalidated_at: Timestamp | null;
  created_at: Timestamp;
  updated_at: Timestamp;
};

export type PaymentAttemptRecordInsert = {
  id?: UUID;
  company_id: UUID;
  invoice_id: UUID;
  status?: PaymentAttemptStatus;
  amount: number;
  currency?: string;
  provider?: PaymentAttemptProvider;
  provider_account_id?: string | null;
  stripe_checkout_session_id?: string | null;
  stripe_payment_intent_id?: string | null;
  expires_at: Timestamp;
  completed_at?: Timestamp | null;
  invalidated_at?: Timestamp | null;
  created_at?: Timestamp;
  updated_at?: Timestamp;
};
