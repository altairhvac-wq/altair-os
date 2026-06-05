import { createClient } from "@/lib/supabase/server";
import { mapDatabaseError } from "@/lib/database/errors";
import type {
  LeadActivityInsert,
  LeadActivityRow,
} from "@/lib/database/types/core-tables";
import type {
  LeadActivity,
  LeadActivityMetadata,
} from "@/shared/types/lead-activity";
import {
  resolveActivityActorName,
  type ProfileSummary,
} from "@/shared/lib/profile-attribution";

type LeadActivityRowWithActor = LeadActivityRow & {
  actor: ProfileSummary | null;
};

function mapMetadata(value: LeadActivityRow["metadata"]): LeadActivityMetadata {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value as LeadActivityMetadata;
}

function mapLeadActivityRow(row: LeadActivityRowWithActor): LeadActivity {
  const metadata = mapMetadata(row.metadata);

  return {
    id: row.id,
    leadId: row.lead_id,
    activityType: row.activity_type,
    note: row.note ?? undefined,
    metadata,
    createdBy: row.created_by ?? undefined,
    createdByName: resolveActivityActorName({
      profile: row.actor,
      actorId: row.created_by,
      metadata,
    }),
    createdAt: row.created_at,
  };
}

export async function recordLeadActivity(
  input: LeadActivityInsert,
): Promise<{ error: string | null }> {
  const supabase = await createClient();

  const { error } = await supabase.from("lead_activities").insert({
    lead_id: input.lead_id,
    company_id: input.company_id,
    activity_type: input.activity_type,
    note: input.note ?? null,
    created_by: input.created_by ?? null,
    metadata: input.metadata ?? {},
  });

  if (error) {
    console.error("[recordLeadActivity] insert failed:", {
      companyId: input.company_id,
      leadId: input.lead_id,
      activityType: input.activity_type,
      code: error.code,
      message: error.message,
    });
    return { error: mapDatabaseError(error) };
  }

  return { error: null };
}

export async function listLeadActivitiesForLead(
  companyId: string,
  leadId: string,
): Promise<LeadActivity[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("lead_activities")
    .select(
      `
      *,
      actor:profiles!lead_activities_created_by_fkey (
        id,
        full_name,
        email
      )
    `,
    )
    .eq("company_id", companyId)
    .eq("lead_id", leadId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[listLeadActivitiesForLead] query failed:", {
      companyId,
      leadId,
      code: error.code,
      message: error.message,
    });
    return [];
  }

  return ((data ?? []) as LeadActivityRowWithActor[]).map(mapLeadActivityRow);
}

export async function getLatestLeadActivityForLeads(
  companyId: string,
  leadIds: string[],
): Promise<Map<string, LeadActivity>> {
  if (leadIds.length === 0) {
    return new Map();
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("lead_activities")
    .select(
      `
      *,
      actor:profiles!lead_activities_created_by_fkey (
        id,
        full_name,
        email
      )
    `,
    )
    .eq("company_id", companyId)
    .in("lead_id", leadIds)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[getLatestLeadActivityForLeads] query failed:", {
      companyId,
      code: error.code,
      message: error.message,
    });
    return new Map();
  }

  const latestByLead = new Map<string, LeadActivity>();

  for (const row of (data ?? []) as LeadActivityRowWithActor[]) {
    if (!latestByLead.has(row.lead_id)) {
      latestByLead.set(row.lead_id, mapLeadActivityRow(row));
    }
  }

  return latestByLead;
}
