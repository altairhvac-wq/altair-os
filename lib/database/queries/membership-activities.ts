import { createClient } from "@/lib/supabase/server";
import { mapDatabaseError } from "@/lib/database/errors";
import type { MembershipActivityInsert } from "@/lib/database/types/core-tables";

export async function recordMembershipActivity(
  input: MembershipActivityInsert,
): Promise<{ error: string | null }> {
  const supabase = await createClient();

  const { error } = await supabase.from("membership_activities").insert({
    company_id: input.company_id,
    membership_id: input.membership_id,
    actor_id: input.actor_id ?? null,
    event_type: input.event_type,
    metadata: input.metadata ?? {},
  });

  if (error) {
    console.error("[recordMembershipActivity] insert failed:", {
      companyId: input.company_id,
      membershipId: input.membership_id,
      eventType: input.event_type,
      code: error.code,
      message: error.message,
    });
    return { error: mapDatabaseError(error) };
  }

  return { error: null };
}

export async function listMembershipActivitiesForCompany(
  companyId: string,
  limit = 100,
) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("membership_activities")
    .select(
      `
      *,
      actor:profiles!membership_activities_actor_id_fkey(full_name, email)
    `,
    )
    .eq("company_id", companyId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[listMembershipActivitiesForCompany] query failed:", {
      companyId,
      code: error.code,
      message: error.message,
    });
    return [];
  }

  return data ?? [];
}
