"use server";

import { revalidatePath } from "next/cache";
import { getActiveCompanyContext } from "@/lib/database/company-context";
import { createJobMaterial } from "@/lib/database/queries/job-materials";
import { getJobById } from "@/lib/database/queries/jobs";
import { recordJobMaterialAddedActivity } from "@/lib/database/services/job-activity";
import type { JobMaterial, JobMaterialFormData } from "@/shared/types/job-material";

export type JobMaterialActionResult = {
  error?: string;
  material?: JobMaterial;
};

function revalidateMaterialPaths(input: {
  jobId: string;
  customerId?: string | null;
}) {
  revalidatePath(`/jobs/${input.jobId}`);
  if (input.customerId) {
    revalidatePath(`/customers/${input.customerId}`);
  }
  revalidatePath("/technician");
}

async function assertJobMaterialWritePermission(jobId: string): Promise<{
  error?: string;
  jobId?: string;
  customerId?: string;
  jobNumber?: string;
}> {
  const context = await getActiveCompanyContext();

  if (!context) {
    return { error: "No active company workspace." };
  }

  const job = await getJobById(context.company.id, jobId);

  if (!job) {
    return { error: "Linked job not found." };
  }

  if (context.permissions.dispatchJobs || context.permissions.manageBilling) {
    return {
      jobId: job.id,
      customerId: job.customerId,
      jobNumber: job.jobNumber,
    };
  }

  if (!context.permissions.viewAssignedJobs) {
    return { error: "You do not have permission to log materials on this job." };
  }

  if (job.assignedTechnicianId !== context.user.id) {
    return {
      error: "You can only log materials on jobs assigned to you.",
    };
  }

  return {
    jobId: job.id,
    customerId: job.customerId,
    jobNumber: job.jobNumber,
  };
}

function validateJobMaterialFormData(
  data: JobMaterialFormData,
): string | null {
  if (!data.jobId.trim()) {
    return "Job is required.";
  }

  if (!data.name.trim()) {
    return "Material name is required.";
  }

  if (!Number.isFinite(data.quantity) || data.quantity <= 0) {
    return "Quantity must be greater than zero.";
  }

  if (!Number.isFinite(data.unitPrice) || data.unitPrice < 0) {
    return "Unit price cannot be negative.";
  }

  if (
    data.unitCost != null &&
    (!Number.isFinite(data.unitCost) || data.unitCost < 0)
  ) {
    return "Unit cost cannot be negative.";
  }

  return null;
}

export async function createJobMaterialAction(input: {
  data: JobMaterialFormData;
}): Promise<JobMaterialActionResult> {
  const context = await getActiveCompanyContext();

  if (!context) {
    return { error: "No active company workspace." };
  }

  const validationError = validateJobMaterialFormData(input.data);

  if (validationError) {
    return { error: validationError };
  }

  const permission = await assertJobMaterialWritePermission(input.data.jobId);

  if (permission.error) {
    return { error: permission.error };
  }

  const { material, error } = await createJobMaterial({
    companyId: context.company.id,
    customerId: permission.customerId ?? null,
    addedBy: context.user.id,
    data: input.data,
  });

  if (error || !material) {
    return { error: error ?? "Failed to log material." };
  }

  await recordJobMaterialAddedActivity({
    companyId: context.company.id,
    jobId: material.jobId,
    actorId: context.user.id,
    customerId: permission.customerId,
    jobNumber: permission.jobNumber,
    material,
  });

  revalidateMaterialPaths({
    jobId: material.jobId,
    customerId: permission.customerId,
  });

  return { material };
}
