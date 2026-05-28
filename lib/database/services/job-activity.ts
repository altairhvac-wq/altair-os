import {
  jobHasActivityEvent,
  recordJobActivity,
  resolveStatusChangeEventType,
} from "@/lib/database/queries/job-activities";
import {
  emitJobAssignedEvent,
  emitJobMaterialAddedEvent,
  emitWorkCompletedEvent,
} from "@/lib/database/services/operational-events";
import { createClient } from "@/lib/supabase/server";
import type { JobStatus } from "@/shared/types/job";
import type { JobWorkflowActionId } from "@/shared/types/job-workflow";
import type { JobMaterial } from "@/shared/types/job-material";

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
  customerId?: string;
}): Promise<void> {
  const { error } = await recordJobActivity({
    company_id: input.companyId,
    job_id: input.jobId,
    actor_id: input.actorId,
    event_type: "job_created",
    metadata: {
      job_number: input.jobNumber,
      customer_id: input.customerId,
      job_id: input.jobId,
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
  customerId?: string;
  jobNumber?: string;
}): Promise<void> {
  const [technicianName, previousTechnicianName] = await Promise.all([
    getProfileName(input.technicianId),
    input.previousTechnicianId
      ? getProfileName(input.previousTechnicianId)
      : Promise.resolve(undefined),
  ]);

  await emitJobAssignedEvent({
    ...input,
    technicianName,
    previousTechnicianName,
  });
}

export async function recordTechnicianUnassignedActivity(input: {
  companyId: string;
  jobId: string;
  actorId: string;
  technicianId: string;
  customerId?: string;
  jobNumber?: string;
}): Promise<void> {
  const technicianName = await getProfileName(input.technicianId);

  const { error } = await recordJobActivity({
    company_id: input.companyId,
    job_id: input.jobId,
    actor_id: input.actorId,
    event_type: "technician_unassigned",
    metadata: {
      customer_id: input.customerId,
      job_id: input.jobId,
      job_number: input.jobNumber,
      technician_id: input.technicianId,
      technician_name: technicianName,
      source: "manual",
    },
  });

  if (error) {
    console.error("[recordTechnicianUnassignedActivity] failed:", {
      jobId: input.jobId,
      error,
    });
  }
}

export async function recordJobLaborAutoClosedActivity(input: {
  companyId: string;
  jobId: string;
  actorId: string;
  closedReason: "completed" | "cancelled";
  entriesClosedCount: number;
  customerId?: string;
  jobNumber?: string;
}): Promise<void> {
  const { error } = await recordJobActivity({
    company_id: input.companyId,
    job_id: input.jobId,
    actor_id: input.actorId,
    event_type: "job_labor_auto_closed",
    metadata: {
      customer_id: input.customerId,
      job_id: input.jobId,
      job_number: input.jobNumber,
      closed_reason: input.closedReason,
      entries_closed_count: input.entriesClosedCount,
      source: "automatic",
      automated: true,
    },
  });

  if (error) {
    console.error("[recordJobLaborAutoClosedActivity] failed:", {
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
  customerId?: string;
  jobNumber?: string;
  completionNotes?: string;
  followUpNotes?: string;
}): Promise<void> {
  const eventType = resolveStatusChangeEventType(input.actionId);

  if (
    input.actionId === "complete" &&
    ((await jobHasActivityEvent(input.companyId, input.jobId, "work_completed")) ||
      (await jobHasActivityEvent(input.companyId, input.jobId, "complete_job")))
  ) {
    return;
  }

  const { error } = await recordJobActivity({
    company_id: input.companyId,
    job_id: input.jobId,
    actor_id: input.actorId,
    event_type: eventType,
    metadata: {
      customer_id: input.customerId,
      job_id: input.jobId,
      job_number: input.jobNumber,
      from_status: input.fromStatus,
      to_status: input.toStatus,
      action_id: input.actionId,
      completion_notes: input.completionNotes?.trim() || undefined,
      follow_up_notes: input.followUpNotes?.trim() || undefined,
    },
  });

  if (error) {
    console.error("[recordJobStatusChangedActivity] failed:", {
      jobId: input.jobId,
      actionId: input.actionId,
      error,
    });
    return;
  }

  if (input.actionId === "complete") {
    await emitWorkCompletedEvent({
      companyId: input.companyId,
      jobId: input.jobId,
      actorId: input.actorId,
      customerId: input.customerId,
      jobNumber: input.jobNumber,
    });
  }
}

export async function recordJobAttachmentUploadedActivity(input: {
  companyId: string;
  jobId: string;
  actorId: string;
  customerId?: string;
  jobNumber?: string;
  attachmentType: string;
  fileName: string;
}): Promise<void> {
  const { error } = await recordJobActivity({
    company_id: input.companyId,
    job_id: input.jobId,
    actor_id: input.actorId,
    event_type: "job_attachment_uploaded",
    metadata: {
      customer_id: input.customerId,
      job_id: input.jobId,
      job_number: input.jobNumber,
      attachment_type: input.attachmentType,
      file_name: input.fileName,
    },
  });

  if (error) {
    console.error("[recordJobAttachmentUploadedActivity] failed:", {
      jobId: input.jobId,
      error,
    });
  }
}

export async function recordJobStatusCorrectedActivity(input: {
  companyId: string;
  jobId: string;
  actorId: string;
  fromStatus: JobStatus;
  toStatus: JobStatus;
  customerId?: string;
  jobNumber?: string;
}): Promise<void> {
  const { error } = await recordJobActivity({
    company_id: input.companyId,
    job_id: input.jobId,
    actor_id: input.actorId,
    event_type: "status_changed",
    metadata: {
      customer_id: input.customerId,
      job_id: input.jobId,
      job_number: input.jobNumber,
      from_status: input.fromStatus,
      to_status: input.toStatus,
      action_id: "status_correction",
      source: "manual",
    },
  });

  if (error) {
    console.error("[recordJobStatusCorrectedActivity] failed:", {
      jobId: input.jobId,
      error,
    });
  }
}

export async function recordJobReopenedActivity(input: {
  companyId: string;
  jobId: string;
  actorId: string;
  fromStatus: JobStatus;
  toStatus: JobStatus;
  customerId?: string;
  jobNumber?: string;
  technicianId?: string | null;
  dispatchReactivated?: boolean;
}): Promise<void> {
  const technicianName = input.technicianId
    ? await getProfileName(input.technicianId)
    : undefined;

  const { error } = await recordJobActivity({
    company_id: input.companyId,
    job_id: input.jobId,
    actor_id: input.actorId,
    event_type: "status_changed",
    metadata: {
      customer_id: input.customerId,
      job_id: input.jobId,
      job_number: input.jobNumber,
      from_status: input.fromStatus,
      to_status: input.toStatus,
      action_id: "reopen",
      source: "manual",
      dispatch_reactivated: input.dispatchReactivated ?? false,
      technician_id: input.technicianId ?? undefined,
      technician_name: technicianName,
    },
  });

  if (error) {
    console.error("[recordJobReopenedActivity] failed:", {
      jobId: input.jobId,
      error,
    });
  }
}

export async function recordJobMaterialAddedActivity(input: {
  companyId: string;
  jobId: string;
  actorId: string;
  customerId?: string;
  jobNumber?: string;
  material: JobMaterial;
}): Promise<void> {
  await emitJobMaterialAddedEvent(input);
}
