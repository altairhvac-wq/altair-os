import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database/types";
import type {
  PaymentProviderEventInsert,
  PaymentProviderEventStatus,
} from "@/lib/payments/provider-events";
import type { PaymentProvider } from "@/lib/payments/types";

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
