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

export async function claimPaymentProviderEventForProcessing(
  supabase: SupabaseClient<Database>,
  provider: PaymentProvider,
  providerEventId: string,
): Promise<{ claimed: boolean }> {
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
    return { claimed: false };
  }

  return { claimed: data !== null };
}

export async function claimStaleProcessingPaymentProviderEvent(
  supabase: SupabaseClient<Database>,
  provider: PaymentProvider,
  providerEventId: string,
  staleBeforeIso: string,
): Promise<{ claimed: boolean }> {
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
    return { claimed: false };
  }

  return { claimed: data !== null };
}

export async function claimPaymentProviderEventForReprocessing(
  supabase: SupabaseClient<Database>,
  provider: PaymentProvider,
  providerEventId: string,
): Promise<{ claimed: boolean }> {
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
    return { claimed: false };
  }

  return { claimed: data !== null };
}
