"use server";

import {
  archiveEstimateAction,
  moveEstimateToTrashAction,
  permanentlyDeleteEstimateAction,
  restoreEstimateAction,
  restoreEstimateFromTrashAction,
  voidEstimateAction,
} from "@/app/actions/estimate-lifecycle";
import { getActiveCompanyContext } from "@/lib/database/company-context";
import { revalidateEstimateOperationalPages } from "@/lib/database/revalidation/operational-pages";
import { NO_ACTIVE_COMPANY_MESSAGE } from "@/lib/database/errors";
import {
  getEstimateById,
  getEstimateDeleteDependencies,
} from "@/lib/database/queries/estimates";
import { runBulkLifecycleAction, type BulkLifecycleActionResult } from "@/shared/lib/bulk-lifecycle-runner";
import {
  getArchiveEstimateBlockReason,
  getMoveEstimateToTrashBlockReason,
  getPermanentDeleteEstimateBlockReason,
  getRestoreEstimateBlockReason,
  getRestoreEstimateFromTrashBlockReason,
  getVoidEstimateBlockReason,
} from "@/shared/lib/estimate-lifecycle";

async function runEstimatesBulk(
  estimateIds: string[],
  action: (estimateId: string) => Promise<{ error?: string }>,
  getBlockReason?: (
    estimate: NonNullable<Awaited<ReturnType<typeof getEstimateById>>>,
    dependencies?: Awaited<ReturnType<typeof getEstimateDeleteDependencies>>,
  ) => string | null,
  needsDependencies = false,
): Promise<BulkLifecycleActionResult> {
  const context = await getActiveCompanyContext();

  return runBulkLifecycleAction({
    ids: estimateIds,
    permissionError: !context
      ? NO_ACTIVE_COMPANY_MESSAGE
      : !context.permissions.manageBilling
        ? "You do not have permission to manage estimates."
        : undefined,
    emptySelectionError: "Select at least one estimate.",
    loadEntity: async (id) => getEstimateById(context!.company.id, id),
    getLabel: (estimate) => estimate.estimateNumber,
    getBlockReason: async (estimate) => {
      const dependencies = needsDependencies
        ? await getEstimateDeleteDependencies(context!.company.id, estimate.id)
        : undefined;
      return getBlockReason?.(estimate, dependencies) ?? null;
    },
    runAction: action,
  });
}

export async function bulkArchiveEstimatesAction(
  estimateIds: string[],
): Promise<BulkLifecycleActionResult> {
  const result = await runEstimatesBulk(
    estimateIds,
    archiveEstimateAction,
    (estimate) => getArchiveEstimateBlockReason(estimate),
  );
  if (result.successCount > 0) revalidateEstimateOperationalPages();
  return result;
}

export async function bulkRestoreEstimatesAction(
  estimateIds: string[],
): Promise<BulkLifecycleActionResult> {
  const result = await runEstimatesBulk(
    estimateIds,
    restoreEstimateAction,
    (estimate) => getRestoreEstimateBlockReason(estimate),
  );
  if (result.successCount > 0) revalidateEstimateOperationalPages();
  return result;
}

export async function bulkVoidEstimatesAction(
  estimateIds: string[],
): Promise<BulkLifecycleActionResult> {
  const result = await runEstimatesBulk(
    estimateIds,
    voidEstimateAction,
    (estimate) => getVoidEstimateBlockReason(estimate),
  );
  if (result.successCount > 0) revalidateEstimateOperationalPages();
  return result;
}

export async function bulkMoveEstimatesToTrashAction(
  estimateIds: string[],
): Promise<BulkLifecycleActionResult> {
  const result = await runEstimatesBulk(
    estimateIds,
    moveEstimateToTrashAction,
    (estimate) => getMoveEstimateToTrashBlockReason(estimate),
  );
  if (result.successCount > 0) revalidateEstimateOperationalPages();
  return result;
}

export async function bulkRestoreEstimatesFromTrashAction(
  estimateIds: string[],
): Promise<BulkLifecycleActionResult> {
  const result = await runEstimatesBulk(
    estimateIds,
    restoreEstimateFromTrashAction,
    (estimate) => getRestoreEstimateFromTrashBlockReason(estimate),
  );
  if (result.successCount > 0) revalidateEstimateOperationalPages();
  return result;
}

export async function bulkPermanentlyDeleteEstimatesAction(
  estimateIds: string[],
): Promise<BulkLifecycleActionResult> {
  const result = await runEstimatesBulk(
    estimateIds,
    permanentlyDeleteEstimateAction,
    (estimate, dependencies) =>
      dependencies
        ? getPermanentDeleteEstimateBlockReason(estimate, dependencies)
        : null,
    true,
  );
  if (result.successCount > 0) revalidateEstimateOperationalPages();
  return result;
}
