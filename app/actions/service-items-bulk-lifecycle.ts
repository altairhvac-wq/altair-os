"use server";

import { revalidateServiceItemOperationalPages } from "@/lib/database/revalidation/operational-pages";
import {
  archiveServiceItemAction,
  moveServiceItemToTrashAction,
  permanentlyDeleteServiceItemAction,
  restoreServiceItemAction,
  restoreServiceItemFromTrashAction,
} from "@/app/actions/service-item-lifecycle";
import { getActiveCompanyContext } from "@/lib/database/company-context";
import { NO_ACTIVE_COMPANY_MESSAGE } from "@/lib/database/errors";
import {
  getServiceItemDeleteDependencies,
  listServiceItems,
} from "@/lib/database/queries/service-items";
import { runBulkLifecycleAction, type BulkLifecycleActionResult } from "@/shared/lib/bulk-lifecycle-runner";
import {
  getArchiveServiceItemBlockReason,
  getMoveServiceItemToTrashBlockReason,
  getPermanentDeleteServiceItemBlockReason,
  getRestoreServiceItemBlockReason,
  getRestoreServiceItemFromTrashBlockReason,
} from "@/shared/lib/service-item-lifecycle";
import type { ServiceItem } from "@/shared/types/service-item";

async function loadServiceItem(
  companyId: string,
  serviceItemId: string,
): Promise<ServiceItem | null> {
  const items = await listServiceItems(companyId, {
    includeArchived: true,
    includeDeleted: true,
  });
  return items.find((item) => item.id === serviceItemId) ?? null;
}

async function runServiceItemsBulk(
  serviceItemIds: string[],
  action: (serviceItemId: string) => Promise<{ error?: string }>,
  getBlockReason?: (
    item: ServiceItem,
    dependencies?: Awaited<ReturnType<typeof getServiceItemDeleteDependencies>>,
  ) => string | null,
  needsDependencies = false,
): Promise<BulkLifecycleActionResult> {
  const context = await getActiveCompanyContext();

  return runBulkLifecycleAction({
    ids: serviceItemIds,
    permissionError: !context
      ? NO_ACTIVE_COMPANY_MESSAGE
      : !context.permissions.manageBilling
        ? "You do not have permission to manage the price book."
        : undefined,
    emptySelectionError: "Select at least one service item.",
    loadEntity: async (id) => loadServiceItem(context!.company.id, id),
    getLabel: (item) => item.name,
    getBlockReason: async (item) => {
      const dependencies = needsDependencies
        ? await getServiceItemDeleteDependencies(context!.company.id, item.id)
        : undefined;
      return getBlockReason?.(item, dependencies) ?? null;
    },
    runAction: action,
  });
}

export async function bulkArchiveServiceItemsAction(
  serviceItemIds: string[],
): Promise<BulkLifecycleActionResult> {
  const result = await runServiceItemsBulk(
    serviceItemIds,
    archiveServiceItemAction,
    (item) => getArchiveServiceItemBlockReason(item),
  );
  if (result.successCount > 0) revalidateServiceItemOperationalPages();
  return result;
}

export async function bulkRestoreServiceItemsAction(
  serviceItemIds: string[],
): Promise<BulkLifecycleActionResult> {
  const result = await runServiceItemsBulk(
    serviceItemIds,
    restoreServiceItemAction,
    (item) => getRestoreServiceItemBlockReason(item),
  );
  if (result.successCount > 0) revalidateServiceItemOperationalPages();
  return result;
}

export async function bulkMoveServiceItemsToTrashAction(
  serviceItemIds: string[],
): Promise<BulkLifecycleActionResult> {
  const result = await runServiceItemsBulk(
    serviceItemIds,
    moveServiceItemToTrashAction,
    (item, dependencies) =>
      dependencies ? getMoveServiceItemToTrashBlockReason(item, dependencies) : null,
    true,
  );
  if (result.successCount > 0) revalidateServiceItemOperationalPages();
  return result;
}

export async function bulkRestoreServiceItemsFromTrashAction(
  serviceItemIds: string[],
): Promise<BulkLifecycleActionResult> {
  const result = await runServiceItemsBulk(
    serviceItemIds,
    restoreServiceItemFromTrashAction,
    (item) => getRestoreServiceItemFromTrashBlockReason(item),
  );
  if (result.successCount > 0) revalidateServiceItemOperationalPages();
  return result;
}

export async function bulkPermanentlyDeleteServiceItemsAction(
  serviceItemIds: string[],
): Promise<BulkLifecycleActionResult> {
  const result = await runServiceItemsBulk(
    serviceItemIds,
    permanentlyDeleteServiceItemAction,
    (item, dependencies) =>
      dependencies
        ? getPermanentDeleteServiceItemBlockReason(item, dependencies)
        : null,
    true,
  );
  if (result.successCount > 0) revalidateServiceItemOperationalPages();
  return result;
}
