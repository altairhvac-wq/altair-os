import { createClient } from "@/lib/supabase/server";
import { mapDatabaseError } from "@/lib/database/errors";
import type {
  JobActivityInsert,
  JobActivityRow,
} from "@/lib/database/types/core-tables";
import type { JobActivityType } from "@/lib/database/types/enums";
import type {
  JobActivity,
  JobActivityMetadata,
} from "@/shared/types/job-activity";
import { JOB_REVIEW_BLOCKER_RESOLUTION_EVENT_TYPES } from "@/shared/types/job-review-resolution";

import {
  resolveActivityActorName,
  type ProfileSummary,
} from "@/shared/lib/profile-attribution";

type JobActivityRowWithActor = JobActivityRow & {
  actor: ProfileSummary | null;
};

function mapMetadata(value: JobActivityRow["metadata"]): JobActivityMetadata {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value as JobActivityMetadata;
}

function mapJobActivityRow(row: JobActivityRowWithActor): JobActivity {
  const metadata = mapMetadata(row.metadata);

  return {
    id: row.id,
    jobId: row.job_id,
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

export async function recordJobActivity(
  input: JobActivityInsert,
): Promise<{ error: string | null }> {
  const supabase = await createClient();

  const { error } = await supabase.from("job_activities").insert({
    company_id: input.company_id,
    job_id: input.job_id,
    actor_id: input.actor_id ?? null,
    event_type: input.event_type,
    metadata: input.metadata ?? {},
  });

  if (error) {
    console.error("[recordJobActivity] insert failed:", {
      companyId: input.company_id,
      jobId: input.job_id,
      eventType: input.event_type,
      code: error.code,
      message: error.message,
    });
    return { error: mapDatabaseError(error) };
  }

  return { error: null };
}

export async function listJobActivitiesForJob(
  companyId: string,
  jobId: string,
): Promise<JobActivity[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("job_activities")
    .select(
      `
      *,
      actor:profiles!job_activities_actor_id_fkey(full_name, email)
    `,
    )
    .eq("company_id", companyId)
    .eq("job_id", jobId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[listJobActivitiesForJob] query failed:", {
      companyId,
      jobId,
      code: error.code,
      message: error.message,
    });
    return [];
  }

  return ((data ?? []) as JobActivityRowWithActor[]).map(mapJobActivityRow);
}

export async function countJobReviewBlockerResolutionsSince(
  companyId: string,
  sinceIso: string,
): Promise<number> {
  const supabase = await createClient();

  const { count, error } = await supabase
    .from("job_activities")
    .select("id", { count: "exact", head: true })
    .eq("company_id", companyId)
    .in("event_type", [...JOB_REVIEW_BLOCKER_RESOLUTION_EVENT_TYPES])
    .gte("created_at", sinceIso);

  if (error) {
    console.error("[countJobReviewBlockerResolutionsSince] query failed:", {
      companyId,
      sinceIso,
      code: error.code,
      message: error.message,
    });
    return 0;
  }

  return count ?? 0;
}

export function resolveStatusChangeEventType(
  actionId: string,
): JobActivityType {
  switch (actionId) {
    case "dispatch":
      return "start_route";
    case "arrive":
      return "technician_arrived";
    case "start_work":
      return "work_started";
    case "complete":
      return "work_completed";
    case "cancel":
      return "job_cancelled";
    default:
      return "status_changed";
  }
}
