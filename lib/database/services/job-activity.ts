import {
  recordJobActivity,
  resolveStatusChangeEventType,
} from "@/lib/database/queries/job-activities";
import {
  notifyJobAssigned,
  notifyWorkCompleted,
} from "@/lib/database/services/operational-notifications";
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

  const { error } = await recordJobActivity({
    company_id: input.companyId,
    job_id: input.jobId,
    actor_id: input.actorId,
    event_type: "technician_assigned",
    metadata: {
      customer_id: input.customerId,
      job_id: input.jobId,
      job_number: input.jobNumber,
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
    return;
  }

  notifyJobAssigned({
    companyId: input.companyId,
    technicianId: input.technicianId,
    actorId: input.actorId,
    jobId: input.jobId,
    jobNumber: input.jobNumber,
    customerId: input.customerId,
    technicianName,
  });
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
  const { error } = await recordJobActivity({
    company_id: input.companyId,
    job_id: input.jobId,
    actor_id: input.actorId,
    event_type: resolveStatusChangeEventType(input.actionId),
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
    notifyWorkCompleted({
      companyId: input.companyId,
      actorId: input.actorId,
      jobId: input.jobId,
      jobNumber: input.jobNumber,
      customerId: input.customerId,
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

export async function recordJobMaterialAddedActivity(input: {
  companyId: string;
  jobId: string;
  actorId: string;
  customerId?: string;
  jobNumber?: string;
  material: JobMaterial;
}): Promise<void> {
  const { error } = await recordJobActivity({
    company_id: input.companyId,
    job_id: input.jobId,
    actor_id: input.actorId,
    event_type: "job_material_added",
    metadata: {
      customer_id: input.customerId,
      job_id: input.jobId,
      job_number: input.jobNumber,
      material_id: input.material.id,
      service_item_id: input.material.serviceItemId,
      name: input.material.name,
      quantity: input.material.quantity,
      unit_cost: input.material.unitCost,
      unit_price: input.material.unitPrice,
      taxable: input.material.taxable,
    },
  });

  if (error) {
    console.error("[recordJobMaterialAddedActivity] failed:", {
      jobId: input.jobId,
      materialId: input.material.id,
      error,
    });
  }
}
