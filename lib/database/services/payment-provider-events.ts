import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database/types";
import type {
  PaymentProviderEventInsert,
  PaymentProviderEventStatus,
} from "@/lib/payments/provider-events";
import type { PaymentProvider } from "@/lib/payments/types";

/** Reclaim rows stuck in processing after worker crashes (updated_at maintained by DB trigger). */
export const STALE_PAYMENT_PROVIDER_EVENT_PROCESSING_MS = 10 * 60 * 1000;

export type PaymentProviderEventLookup = {
  id: string;
  processingStatus: PaymentProviderEventStatus;
  updatedAt: string;
};

export function isStalePaymentProviderEventProcessing(
  updatedAt: string,
  nowMs: number = Date.now(),
): boolean {
  const updatedAtMs = Date.parse(updatedAt);

  if (Number.isNaN(updatedAtMs)) {
    return false;
  }

  return nowMs - updatedAtMs >= STALE_PAYMENT_PROVIDER_EVENT_PROCESSING_MS;
}

export type UpdatePaymentProviderEventParams = {
  provider: PaymentProvider;
  providerEventId: string;
  processingStatus: PaymentProviderEventStatus;
  companyId?: string | null;
  errorMessage?: string | null;
  processedAt?: string | null;
};

export async function updatePaymentProviderEvent(
  supabase: SupabaseClient<Database>,
  params: UpdatePaymentProviderEventParams,
): Promise<{ ok: boolean }> {
  const update: Partial<PaymentProviderEventInsert> = {
    processing_status: params.processingStatus,
  };

  if (params.companyId !== undefined) {
    update.company_id = params.companyId;
  }

  if (params.errorMessage !== undefined) {
    update.error_message = params.errorMessage;
  }

  if (params.processedAt !== undefined) {
    update.processed_at = params.processedAt;
  }

  const { error } = await supabase
    .from("payment_provider_events")
    .update(update)
    .eq("provider", params.provider)
    .eq("provider_event_id", params.providerEventId);

  if (error) {
    console.error("[updatePaymentProviderEvent] update failed:", {
      provider: params.provider,
      providerEventId: params.providerEventId,
      code: error.code,
      message: error.message,
    });
    return { ok: false };
  }

  return { ok: true };
}

export async function findPaymentProviderEvent(
  supabase: SupabaseClient<Database>,
  provider: PaymentProvider,
  providerEventId: string,
): Promise<PaymentProviderEventLookup | null> {
  const { data, error } = await supabase
    .from("payment_provider_events")
    .select("id, processing_status, updated_at")
    .eq("provider", provider)
    .eq("provider_event_id", providerEventId)
    .maybeSingle();

  if (error) {
    console.error("[findPaymentProviderEvent] query failed:", {
      provider,
      providerEventId,
      code: error.code,
      message: error.message,
    });
    return null;
  }

  if (!data) {
    return null;
  }

  return {
    id: data.id,
    processingStatus: data.processing_status as PaymentProviderEventStatus,
    updatedAt: data.updated_at,
  };
}

/**
 * Result of a conditional claim update against payment_provider_events.
 *
 * `claimed: false, error: false` means the conditional UPDATE ran successfully but
 * matched zero rows — a legitimate concurrent race (another request already claimed
 * or finalized this event). It is safe for the caller to treat this as "someone else
 * has it" and respond 200 to Stripe.
 *
 * `claimed: false, error: true` means the UPDATE itself failed (transient DB/network
 * failure) — we do not know who, if anyone, holds the claim. Callers MUST NOT treat
 * this as a benign skip: per the payment integrity invariant, an unresolved claim on a
 * conclusively paid checkout session must produce HTTP 500 so Stripe retries, never a
 * silent 200.
 */
export type ClaimPaymentProviderEventResult =
  | { claimed: true; error: false }
  | { claimed: false; error: false }
  | { claimed: false; error: true };

export async function claimPaymentProviderEventForProcessing(
  supabase: SupabaseClient<Database>,
  provider: PaymentProvider,
  providerEventId: string,
): Promise<ClaimPaymentProviderEventResult> {
  const { data, error } = await supabase
    .from("payment_provider_events")
    .update({ processing_status: "processing" })
    .eq("provider", provider)
    .eq("provider_event_id", providerEventId)
    .eq("processing_status", "received")
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("[claimPaymentProviderEventForProcessing] update failed:", {
      provider,
      providerEventId,
      code: error.code,
      message: error.message,
    });
    return { claimed: false, error: true };
  }

  return data !== null
    ? { claimed: true, error: false }
    : { claimed: false, error: false };
}

export async function claimStaleProcessingPaymentProviderEvent(
  supabase: SupabaseClient<Database>,
  provider: PaymentProvider,
  providerEventId: string,
  staleBeforeIso: string,
): Promise<ClaimPaymentProviderEventResult> {
  const { data, error } = await supabase
    .from("payment_provider_events")
    .update({ processing_status: "processing" })
    .eq("provider", provider)
    .eq("provider_event_id", providerEventId)
    .eq("processing_status", "processing")
    .lt("updated_at", staleBeforeIso)
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("[claimStaleProcessingPaymentProviderEvent] update failed:", {
      provider,
      providerEventId,
      code: error.code,
      message: error.message,
    });
    return { claimed: false, error: true };
  }

  return data !== null
    ? { claimed: true, error: false }
    : { claimed: false, error: false };
}

export async function claimPaymentProviderEventForReprocessing(
  supabase: SupabaseClient<Database>,
  provider: PaymentProvider,
  providerEventId: string,
): Promise<ClaimPaymentProviderEventResult> {
  const { data, error } = await supabase
    .from("payment_provider_events")
    .update({ processing_status: "processing" })
    .eq("provider", provider)
    .eq("provider_event_id", providerEventId)
    .in("processing_status", ["received", "failed"])
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("[claimPaymentProviderEventForReprocessing] update failed:", {
      provider,
      providerEventId,
      code: error.code,
      message: error.message,
    });
    return { claimed: false, error: true };
  }

  return data !== null
    ? { claimed: true, error: false }
    : { claimed: false, error: false };
}
