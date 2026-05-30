"use server";

import { revalidatePath } from "next/cache";
import { getActiveCompanyContext } from "@/lib/database/company-context";
import { createJobMaterial } from "@/lib/database/queries/job-materials";
import { getJobById } from "@/lib/database/queries/jobs";
import { getActiveServiceItemForCompany } from "@/lib/database/queries/service-items";
import { recordJobMaterialAddedActivity } from "@/lib/database/services/job-activity";
import {
  captureCompletedJobReviewSnapshot,
  trackJobReviewBlockerResolutions,
} from "@/lib/database/services/job-review-resolution";
import type { JobMaterial, JobMaterialFormData } from "@/shared/types/job-material";
import type { JobStatus } from "@/shared/types/job";
import { roundJobMaterialAmount } from "@/shared/types/job-material";
import { isTerminalJobStatus } from "@/shared/types/job-workflow";

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
  jobStatus?: JobStatus;
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
      jobStatus: job.status,
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

  if (isTerminalJobStatus(job.status)) {
    return {
      error: "Materials cannot be logged on completed or cancelled jobs.",
    };
  }

  return {
    jobId: job.id,
    customerId: job.customerId,
    jobNumber: job.jobNumber,
    jobStatus: job.status,
  };
}

function normalizeJobMaterialFormData(
  data: JobMaterialFormData,
): JobMaterialFormData {
  return {
    ...data,
    jobId: data.jobId.trim(),
    name: data.name.trim(),
    description: data.description?.trim() || undefined,
    serviceItemId: data.serviceItemId?.trim() || undefined,
    quantity: roundJobMaterialAmount(data.quantity),
    unitCost:
      data.unitCost == null ? null : roundJobMaterialAmount(data.unitCost),
    unitPrice: roundJobMaterialAmount(Math.max(data.unitPrice, 0)),
  };
}

function validateJobMaterialFormData(
  data: JobMaterialFormData,
): string | null {
  if (!data.jobId) {
    return "Job is required.";
  }

  if (!data.name) {
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

async function resolveJobMaterialFormData(input: {
  companyId: string;
  data: JobMaterialFormData;
}): Promise<{ data?: JobMaterialFormData; error?: string }> {
  const serviceItemId = input.data.serviceItemId?.trim();

  if (!serviceItemId) {
    return { data: input.data };
  }

  const serviceItem = await getActiveServiceItemForCompany(
    input.companyId,
    serviceItemId,
  );

  if (!serviceItem) {
    return {
      error:
        "Selected price book item is invalid, inactive, or not available for this company.",
    };
  }

  return {
    data: {
      ...input.data,
      serviceItemId: serviceItem.id,
      name: serviceItem.name,
      description: serviceItem.description,
      unitCost: serviceItem.unitCost ?? null,
      unitPrice: serviceItem.unitPrice,
      taxable: serviceItem.taxable,
    },
  };
}

export async function createJobMaterialAction(input: {
  data: JobMaterialFormData;
}): Promise<JobMaterialActionResult> {
  const context = await getActiveCompanyContext();

  if (!context) {
    return { error: "No active company workspace." };
  }

  const normalizedData = normalizeJobMaterialFormData(input.data);
  const validationError = validateJobMaterialFormData(normalizedData);

  if (validationError) {
    return { error: validationError };
  }

  const permission = await assertJobMaterialWritePermission(normalizedData.jobId);

  if (permission.error || !permission.jobId) {
    return { error: permission.error ?? "Linked job not found." };
  }

  const resolved = await resolveJobMaterialFormData({
    companyId: context.company.id,
    data: normalizedData,
  });

  if (resolved.error || !resolved.data) {
    return { error: resolved.error ?? "Failed to resolve material details." };
  }

  const reviewSnapshotBefore =
    permission.jobStatus != null
      ? await captureCompletedJobReviewSnapshot(
          context.company.id,
          permission.jobId,
          permission.jobStatus,
        )
      : null;

  const { material, error } = await createJobMaterial({
    companyId: context.company.id,
    customerId: permission.customerId ?? null,
    addedBy: context.user.id,
    data: {
      ...resolved.data,
      jobId: permission.jobId,
    },
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

  if (reviewSnapshotBefore && permission.jobStatus) {
    void trackJobReviewBlockerResolutions({
      companyId: context.company.id,
      jobId: material.jobId,
      jobStatus: permission.jobStatus,
      actorId: context.user.id,
      beforeSnapshot: reviewSnapshotBefore,
      jobNumber: permission.jobNumber,
      customerId: permission.customerId,
    }).catch((trackingError) => {
      console.error(
        "[createJobMaterialAction] review resolution tracking failed:",
        {
          jobId: material.jobId,
          trackingError,
        },
      );
    });
  }

  revalidateMaterialPaths({
    jobId: material.jobId,
    customerId: permission.customerId,
  });

  return { material };
}
