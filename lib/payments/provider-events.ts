/**
 * Provider-neutral payment webhook event ledger types.
 * Phase 0.6: schema foundation only. No runtime webhook processing yet.
 */

import type { Json, Timestamp, UUID } from "@/lib/database/types/enums";
import type { PaymentProvider } from "./types";

export type PaymentProviderEventStatus =
  | "received"
  | "processing"
  | "processed"
  | "failed"
  | "ignored";

export type PaymentProviderEvent = {
  id: UUID;
  company_id: UUID | null;
  provider: PaymentProvider;
  provider_event_id: string;
  event_type: string;
  processing_status: PaymentProviderEventStatus;
  payload: Json;
  processed_at: Timestamp | null;
  error_message: string | null;
  created_at: Timestamp;
  updated_at: Timestamp;
};

export type PaymentProviderEventInsert = {
  id?: UUID;
  company_id?: UUID | null;
  provider: PaymentProvider;
  provider_event_id: string;
  event_type: string;
  processing_status?: PaymentProviderEventStatus;
  payload?: Json;
  processed_at?: Timestamp | null;
  error_message?: string | null;
  created_at?: Timestamp;
  updated_at?: Timestamp;
};
