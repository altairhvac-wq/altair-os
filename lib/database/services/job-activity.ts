import {
  recordJobActivity,
  resolveStatusChangeEventType,
} from "@/lib/database/queries/job-activities";
import { createClient } from "@/lib/supabase/server";
import type { JobStatus } from "@/shared/types/job";
import type { JobWorkflowActionId } from "@/shared/types/job-workflow";

async function getProfileName(profileId: string): Promise<string | undefined> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("profiles")
    .select("full_name, email")
    .eq("id", profileId)
    .maybeSingle();

  if (error || !data) {
    return undefined;
  }

  return data.full_name?.trim() || data.email;
}

export async function recordJobCreatedActivity(input: {
  companyId: string;
  jobId: string;
  actorId: string;
  jobNumber: string;
}): Promise<void> {
  const { error } = await recordJobActivity({
    company_id: input.companyId,
    job_id: input.jobId,
    actor_id: input.actorId,
    event_type: "job_created",
    metadata: {
      job_number: input.jobNumber,
    },
  });

  if (error) {
    console.error("[recordJobCreatedActivity] failed:", {
      jobId: input.jobId,
      error,
    });
  }
}

export async function recordTechnicianAssignedActivity(input: {
  companyId: string;
  jobId: string;
  actorId: string;
  technicianId: string;
  previousTechnicianId?: string | null;
}): Promise<void> {
  const [technicianName, previousTechnicianName] = await Promise.all([
    getProfileName(input.technicianId),
    input.previousTechnicianId
      ? getProfileName(input.previousTechnicianId)
      : Promise.resolve(undefined),
  ]);

  const { error } = await recordJobActivity({
    company_id: input.companyId,
    job_id: input.jobId,
    actor_id: input.actorId,
    event_type: "technician_assigned",
    metadata: {
      technician_id: input.technicianId,
      technician_name: technicianName,
      previous_technician_id: input.previousTechnicianId ?? undefined,
      previous_technician_name: previousTechnicianName,
    },
  });

  if (error) {
    console.error("[recordTechnicianAssignedActivity] failed:", {
      jobId: input.jobId,
      error,
    });
  }
}

export async function recordJobStatusChangedActivity(input: {
  companyId: string;
  jobId: string;
  actorId: string;
  actionId: JobWorkflowActionId;
  fromStatus: JobStatus;
  toStatus: JobStatus;
}): Promise<void> {
  const { error } = await recordJobActivity({
    company_id: input.companyId,
    job_id: input.jobId,
    actor_id: input.actorId,
    event_type: resolveStatusChangeEventType(input.actionId),
    metadata: {
      from_status: input.fromStatus,
      to_status: input.toStatus,
      action_id: input.actionId,
    },
  });

  if (error) {
    console.error("[recordJobStatusChangedActivity] failed:", {
      jobId: input.jobId,
      actionId: input.actionId,
      error,
    });
  }
}
