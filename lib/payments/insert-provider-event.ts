import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database/types";
import type { Json } from "@/lib/database/types/enums";
import type { PaymentProviderEventInsert } from "./provider-events";

export type InsertPaymentProviderEventResult =
  | { ok: true; duplicate: false }
  | { ok: true; duplicate: true }
  | { ok: false };

export async function insertPaymentProviderEvent(
  supabase: SupabaseClient<Database>,
  row: PaymentProviderEventInsert,
): Promise<InsertPaymentProviderEventResult> {
  const { error } = await supabase.from("payment_provider_events").insert(row);

  if (error) {
    if (error.code === "23505") {
      return { ok: true, duplicate: true };
    }

    console.error(
      "[payments] payment_provider_events insert failed:",
      error.code ?? "unknown",
    );
    return { ok: false };
  }

  return { ok: true, duplicate: false };
}

export function stripeEventPayload(event: unknown): Json {
  return JSON.parse(JSON.stringify(event)) as Json;
}
