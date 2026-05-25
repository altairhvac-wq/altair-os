"use server";

import { revalidatePath } from "next/cache";
import { getActiveCompanyContext } from "@/lib/database/company-context";
import {
  createEstimate,
  getEstimateById,
  updateEstimateStatus,
} from "@/lib/database/queries/estimates";
import {
  recordEstimateCreatedActivity,
  recordEstimateStatusChangedActivity,
} from "@/lib/database/services/estimate-activity";
import type { EstimateDetail, EstimateFormData, EstimateStatus } from "@/shared/types/estimate";

export type CreateEstimateActionResult = {
  error?: string;
  estimate?: EstimateDetail;
};

export async function createEstimateAction(
  data: EstimateFormData,
): Promise<CreateEstimateActionResult> {
  const context = await getActiveCompanyContext();

  if (!context) {
    return { error: "No active company workspace." };
  }

  if (!context.permissions.manageBilling) {
    return { error: "You do not have permission to create estimates." };
  }

  const { estimate, error } = await createEstimate(context.company.id, data);

  if (error || !estimate) {
    return { error: error ?? "Failed to create estimate." };
  }

  await recordEstimateCreatedActivity({
    companyId: context.company.id,
    estimateId: estimate.id,
    actorId: context.user.id,
    estimateNumber: estimate.estimateNumber,
    customerId: estimate.customerId,
    jobId: estimate.jobId,
    jobNumber: estimate.jobNumber,
  });

  revalidatePath("/estimates");
  return { estimate };
}

export type UpdateEstimateStatusActionResult = {
  error?: string;
  estimate?: EstimateDetail;
};

export async function updateEstimateStatusAction(
  estimateId: string,
  fromStatus: EstimateStatus,
  toStatus: EstimateStatus,
): Promise<UpdateEstimateStatusActionResult> {
  const context = await getActiveCompanyContext();

  if (!context) {
    return { error: "No active company workspace." };
  }

  if (!context.permissions.manageBilling) {
    return { error: "You do not have permission to update estimates." };
  }

  const currentEstimate = await getEstimateById(context.company.id, estimateId);

  if (!currentEstimate) {
    return { error: "Estimate not found." };
  }

  if (currentEstimate.status !== fromStatus) {
    return {
      error: "Estimate status has changed. Refresh the page and try again.",
    };
  }

  const { estimate, error } = await updateEstimateStatus(
    context.company.id,
    estimateId,
    fromStatus,
    toStatus,
  );

  if (error || !estimate) {
    return { error: error ?? "Failed to update estimate status." };
  }

  await recordEstimateStatusChangedActivity({
    companyId: context.company.id,
    estimateId,
    actorId: context.user.id,
    fromStatus,
    toStatus,
    customerId: estimate.customerId,
    jobId: estimate.jobId,
    jobNumber: estimate.jobNumber,
    estimateNumber: estimate.estimateNumber,
  });

  revalidatePath("/estimates");
  revalidatePath(`/estimates/${estimateId}`);

  return { estimate };
}
