"use server";

import { getActiveCompanyContext } from "@/lib/database/company-context";
import { revalidateEstimateOperationalPages } from "@/lib/database/revalidation/operational-pages";
import { NO_ACTIVE_COMPANY_MESSAGE } from "@/lib/database/errors";
import {
  archiveEstimate,
  getEstimateById,
  getEstimateDeleteDependencies,
  moveEstimateToTrash,
  permanentlyDeleteEstimate,
  restoreEstimate,
  restoreEstimateFromTrash,
  voidEstimate,
} from "@/lib/database/queries/estimates";
import {
  canArchiveEstimate,
  canMoveEstimateToTrash,
  canPermanentlyDeleteEstimate,
  canRestoreEstimate,
  canRestoreEstimateFromTrash,
  canVoidEstimate,
  getArchiveEstimateBlockReason,
  getMoveEstimateToTrashBlockReason,
  getPermanentDeleteEstimateBlockReason,
  getRestoreEstimateBlockReason,
  getRestoreEstimateFromTrashBlockReason,
  getVoidEstimateBlockReason,
} from "@/shared/lib/estimate-lifecycle";
import type { Estimate } from "@/shared/types/estimate";

export type EstimateLifecycleActionResult = {
  error?: string;
  estimate?: Estimate;
  deleted?: boolean;
};

function revalidateEstimatePaths(estimateId?: string) {
  revalidateEstimateOperationalPages(estimateId);
}

export async function archiveEstimateAction(
  estimateId: string,
): Promise<EstimateLifecycleActionResult> {
  const context = await getActiveCompanyContext();
  if (!context) return { error: NO_ACTIVE_COMPANY_MESSAGE };
  if (!context.permissions.manageBilling) {
    return { error: "You do not have permission to manage estimates." };
  }

  const existing = await getEstimateById(context.company.id, estimateId);
  if (!existing) return { error: "Estimate not found." };

  const blockReason = getArchiveEstimateBlockReason(existing);
  if (blockReason || !canArchiveEstimate(existing)) {
    return { error: blockReason ?? "This estimate cannot be archived." };
  }

  const { estimate, error } = await archiveEstimate(context.company.id, estimateId);
  if (error || !estimate) {
    return { error: error ?? "We couldn't archive this estimate." };
  }

  revalidateEstimatePaths(estimateId);
  return { estimate };
}

export async function restoreEstimateAction(
  estimateId: string,
): Promise<EstimateLifecycleActionResult> {
  const context = await getActiveCompanyContext();
  if (!context) return { error: NO_ACTIVE_COMPANY_MESSAGE };
  if (!context.permissions.manageBilling) {
    return { error: "You do not have permission to manage estimates." };
  }

  const existing = await getEstimateById(context.company.id, estimateId);
  if (!existing) return { error: "Estimate not found." };

  const blockReason = getRestoreEstimateBlockReason(existing);
  if (blockReason || !canRestoreEstimate(existing)) {
    return { error: blockReason ?? "This estimate cannot be restored." };
  }

  const { estimate, error } = await restoreEstimate(context.company.id, estimateId);
  if (error || !estimate) {
    return { error: error ?? "We couldn't restore this estimate." };
  }

  revalidateEstimatePaths(estimateId);
  return { estimate };
}

export async function voidEstimateAction(
  estimateId: string,
): Promise<EstimateLifecycleActionResult> {
  const context = await getActiveCompanyContext();
  if (!context) return { error: NO_ACTIVE_COMPANY_MESSAGE };
  if (!context.permissions.manageBilling) {
    return { error: "You do not have permission to manage estimates." };
  }

  const existing = await getEstimateById(context.company.id, estimateId);
  if (!existing) return { error: "Estimate not found." };

  const blockReason = getVoidEstimateBlockReason(existing);
  if (blockReason || !canVoidEstimate(existing)) {
    return { error: blockReason ?? "This estimate cannot be voided." };
  }

  const { estimate, error } = await voidEstimate(context.company.id, estimateId);
  if (error || !estimate) {
    return { error: error ?? "We couldn't void this estimate." };
  }

  revalidateEstimatePaths(estimateId);
  return { estimate };
}

export async function moveEstimateToTrashAction(
  estimateId: string,
): Promise<EstimateLifecycleActionResult> {
  const context = await getActiveCompanyContext();
  if (!context) return { error: NO_ACTIVE_COMPANY_MESSAGE };
  if (!context.permissions.manageBilling) {
    return { error: "You do not have permission to manage estimates." };
  }

  const existing = await getEstimateById(context.company.id, estimateId);
  if (!existing) return { error: "Estimate not found." };

  const blockReason = getMoveEstimateToTrashBlockReason(existing);
  if (blockReason || !canMoveEstimateToTrash(existing)) {
    return { error: blockReason ?? "This estimate cannot be moved to Recently Deleted." };
  }

  const { estimate, error } = await moveEstimateToTrash(context.company.id, estimateId);
  if (error || !estimate) {
    return { error: error ?? "We couldn't move this estimate to Recently Deleted." };
  }

  revalidateEstimatePaths(estimateId);
  return { estimate };
}

export async function restoreEstimateFromTrashAction(
  estimateId: string,
): Promise<EstimateLifecycleActionResult> {
  const context = await getActiveCompanyContext();
  if (!context) return { error: NO_ACTIVE_COMPANY_MESSAGE };
  if (!context.permissions.manageBilling) {
    return { error: "You do not have permission to manage estimates." };
  }

  const existing = await getEstimateById(context.company.id, estimateId);
  if (!existing) return { error: "Estimate not found." };

  const blockReason = getRestoreEstimateFromTrashBlockReason(existing);
  if (blockReason || !canRestoreEstimateFromTrash(existing)) {
    return { error: blockReason ?? "This estimate cannot be restored." };
  }

  const { estimate, error } = await restoreEstimateFromTrash(
    context.company.id,
    estimateId,
  );
  if (error || !estimate) {
    return { error: error ?? "We couldn't restore this estimate." };
  }

  revalidateEstimatePaths(estimateId);
  return { estimate };
}

export async function permanentlyDeleteEstimateAction(
  estimateId: string,
): Promise<EstimateLifecycleActionResult> {
  const context = await getActiveCompanyContext();
  if (!context) return { error: NO_ACTIVE_COMPANY_MESSAGE };
  if (!context.permissions.manageBilling) {
    return { error: "You do not have permission to manage estimates." };
  }

  const existing = await getEstimateById(context.company.id, estimateId);
  if (!existing) return { error: "Estimate not found." };

  const dependencies = await getEstimateDeleteDependencies(
    context.company.id,
    estimateId,
  );
  const blockReason = getPermanentDeleteEstimateBlockReason(existing, dependencies);
  if (blockReason || !canPermanentlyDeleteEstimate(existing, dependencies)) {
    return { error: blockReason ?? "This estimate cannot be permanently deleted." };
  }

  const { success, error } = await permanentlyDeleteEstimate(
    context.company.id,
    estimateId,
  );
  if (!success || error) {
    return { error: error ?? "We couldn't permanently delete this estimate." };
  }

  revalidateEstimatePaths();
  return { deleted: true };
}
