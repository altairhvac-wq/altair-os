/**
 * Company payment account linkage types (DB row shape).
 * Phase 0.9: schema foundation only. No Stripe onboarding runtime yet.
 */

import type { Json, Timestamp, UUID } from "@/lib/database/types/enums";
import type {
  CompanyPaymentAccountProvider,
  CompanyPaymentAccountStatus,
} from "./types";

export type { CompanyPaymentAccountProvider, CompanyPaymentAccountStatus };

export type CompanyPaymentAccountRecord = {
  id: UUID;
  company_id: UUID;
  provider: CompanyPaymentAccountProvider;
  provider_account_id: string | null;
  status: CompanyPaymentAccountStatus;
  charges_enabled: boolean;
  payouts_enabled: boolean;
  online_payments_enabled: boolean;
  onboarding_completed_at: Timestamp | null;
  disabled_at: Timestamp | null;
  last_synced_at: Timestamp | null;
  provider_metadata: Json;
  created_at: Timestamp;
  updated_at: Timestamp;
};

export type CompanyPaymentAccountRecordInsert = {
  id?: UUID;
  company_id: UUID;
  provider: CompanyPaymentAccountProvider;
  provider_account_id?: string | null;
  status?: CompanyPaymentAccountStatus;
  charges_enabled?: boolean;
  payouts_enabled?: boolean;
  online_payments_enabled?: boolean;
  onboarding_completed_at?: Timestamp | null;
  disabled_at?: Timestamp | null;
  last_synced_at?: Timestamp | null;
  provider_metadata?: Json;
  created_at?: Timestamp;
  updated_at?: Timestamp;
};
