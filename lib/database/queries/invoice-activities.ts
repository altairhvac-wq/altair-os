import { createClient } from "@/lib/supabase/server";
import { mapDatabaseError } from "@/lib/database/errors";
import type { InvoiceActivityInsert, InvoiceActivityRow } from "@/lib/database/types/core-tables";
import type { InvoiceActivityType } from "@/lib/database/types/enums";
import type {
  InvoiceActivity,
  InvoiceActivityMetadata,
} from "@/shared/types/invoice-activity";
import type { InvoiceStatus } from "@/shared/types/invoice";

import {
  resolveActivityActorName,
  type ProfileSummary,
} from "@/shared/lib/profile-attribution";

type InvoiceActivityRowWithActor = InvoiceActivityRow & {
  actor: ProfileSummary | null;
};

function mapMetadata(
  value: InvoiceActivityRow["metadata"],
): InvoiceActivityMetadata {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value as InvoiceActivityMetadata;
}

function mapInvoiceActivityRow(
  row: InvoiceActivityRowWithActor,
): InvoiceActivity {
  const metadata = mapMetadata(row.metadata);

  return {
    id: row.id,
    invoiceId: row.invoice_id,
    eventType: row.event_type,
    metadata,
    actorId: row.actor_id ?? undefined,
    actorName: resolveActivityActorName({
      profile: row.actor,
      actorId: row.actor_id,
      metadata,
    }),
    createdAt: row.created_at,
  };
}

export function resolveInvoiceStatusEventType(
  toStatus: InvoiceStatus,
): InvoiceActivityType {
  switch (toStatus) {
    case "sent":
      return "invoice_sent";
    case "void":
      return "invoice_voided";
    case "cancelled":
      return "invoice_cancelled";
    default:
      return "status_changed";
  }
}

export async function recordInvoiceActivity(
  input: InvoiceActivityInsert,
): Promise<{ error: string | null }> {
  const supabase = await createClient();

  const { error } = await supabase.from("invoice_activities").insert({
    company_id: input.company_id,
    invoice_id: input.invoice_id,
    actor_id: input.actor_id ?? null,
    event_type: input.event_type,
    metadata: input.metadata ?? {},
  });

  if (error) {
    console.error("[recordInvoiceActivity] insert failed:", {
      companyId: input.company_id,
      invoiceId: input.invoice_id,
      eventType: input.event_type,
      code: error.code,
      message: error.message,
    });
    return { error: mapDatabaseError(error) };
  }

  return { error: null };
}

export async function listInvoiceActivitiesForInvoice(
  companyId: string,
  invoiceId: string,
): Promise<InvoiceActivity[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("invoice_activities")
    .select(
      `
      *,
      actor:profiles!invoice_activities_actor_id_fkey(full_name, email)
    `,
    )
    .eq("company_id", companyId)
    .eq("invoice_id", invoiceId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[listInvoiceActivitiesForInvoice] query failed:", {
      companyId,
      invoiceId,
      code: error.code,
      message: error.message,
    });
    return [];
  }

  return ((data ?? []) as InvoiceActivityRowWithActor[]).map(
    mapInvoiceActivityRow,
  );
}
