import { createClient } from "@/lib/supabase/server";
import { mapDatabaseError } from "@/lib/database/errors";
import type { TimeActivityInsert } from "@/lib/database/types/core-tables";

export async function recordTimeActivity(
  input: TimeActivityInsert,
): Promise<{ error: string | null }> {
  const supabase = await createClient();

  const { error } = await supabase.from("time_activities").insert({
    company_id: input.company_id,
    time_entry_id: input.time_entry_id,
    technician_id: input.technician_id,
    job_id: input.job_id ?? null,
    actor_id: input.actor_id ?? null,
    event_type: input.event_type,
    metadata: input.metadata ?? {},
  });

  if (error) {
    console.error("[recordTimeActivity] insert failed:", {
      companyId: input.company_id,
      timeEntryId: input.time_entry_id,
      eventType: input.event_type,
      code: error.code,
      message: error.message,
    });
    return { error: mapDatabaseError(error) };
  }

  return { error: null };
}
