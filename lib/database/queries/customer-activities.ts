import { createClient } from "@/lib/supabase/server";
import { mapDatabaseError } from "@/lib/database/errors";
import type {
  CustomerActivityInsert,
  CustomerActivityRow,
} from "@/lib/database/types/core-tables";
import type {
  CustomerActivity,
  CustomerActivityMetadata,
} from "@/shared/types/customer-activity";

import {
  resolveActivityActorName,
  type ProfileSummary,
} from "@/shared/lib/profile-attribution";

type CustomerActivityRowWithActor = CustomerActivityRow & {
  actor: ProfileSummary | null;
};

function mapMetadata(
  value: CustomerActivityRow["metadata"],
): CustomerActivityMetadata {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value as CustomerActivityMetadata;
}

function mapCustomerActivityRow(
  row: CustomerActivityRowWithActor,
): CustomerActivity {
  const metadata = mapMetadata(row.metadata);

  return {
    id: row.id,
    customerId: row.customer_id,
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

export async function recordCustomerActivity(
  input: CustomerActivityInsert,
): Promise<{ error: string | null }> {
  const supabase = await createClient();

  const { error } = await supabase.from("customer_activities").insert({
    company_id: input.company_id,
    customer_id: input.customer_id,
    actor_id: input.actor_id ?? null,
    event_type: input.event_type,
    metadata: input.metadata ?? {},
  });

  if (error) {
    console.error("[recordCustomerActivity] insert failed:", {
      companyId: input.company_id,
      customerId: input.customer_id,
      eventType: input.event_type,
      code: error.code,
      message: error.message,
    });
    return { error: mapDatabaseError(error) };
  }

  return { error: null };
}

export async function listCustomerActivitiesForCustomer(
  companyId: string,
  customerId: string,
): Promise<CustomerActivity[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("customer_activities")
    .select(
      `
      *,
      actor:profiles!customer_activities_actor_id_fkey(full_name, email)
    `,
    )
    .eq("company_id", companyId)
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[listCustomerActivitiesForCustomer] query failed:", {
      companyId,
      customerId,
      code: error.code,
      message: error.message,
    });
    return [];
  }

  return ((data ?? []) as CustomerActivityRowWithActor[]).map(
    mapCustomerActivityRow,
  );
}
