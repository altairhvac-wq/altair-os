"use server";

import { getActiveCompanyContext } from "@/lib/database/company-context";
import { revalidateServiceItemOperationalPages } from "@/lib/database/revalidation/operational-pages";
import { NO_ACTIVE_COMPANY_MESSAGE } from "@/lib/database/errors";
import {
  archiveServiceItem,
  getServiceItemDeleteDependencies,
  listServiceItems,
  moveServiceItemToTrash,
  permanentlyDeleteServiceItem,
  restoreServiceItem,
  restoreServiceItemFromTrash,
} from "@/lib/database/queries/service-items";
import {
  canArchiveServiceItem,
  canMoveServiceItemToTrash,
  canPermanentlyDeleteServiceItem,
  canRestoreServiceItem,
  canRestoreServiceItemFromTrash,
  getArchiveServiceItemBlockReason,
  getMoveServiceItemToTrashBlockReason,
  getPermanentDeleteServiceItemBlockReason,
  getRestoreServiceItemBlockReason,
  getRestoreServiceItemFromTrashBlockReason,
} from "@/shared/lib/service-item-lifecycle";
import type { ServiceItem } from "@/shared/types/service-item";

export type ServiceItemLifecycleActionResult = {
  error?: string;
  serviceItem?: ServiceItem;
  deleted?: boolean;
};

function revalidateServiceItemPaths() {
  revalidateServiceItemOperationalPages();
}

async function getServiceItemById(
  companyId: string,
  serviceItemId: string,
): Promise<ServiceItem | null> {
  const items = await listServiceItems(companyId, {
    includeArchived: true,
    includeDeleted: true,
  });
  return items.find((item) => item.id === serviceItemId) ?? null;
}

export async function archiveServiceItemAction(
  serviceItemId: string,
): Promise<ServiceItemLifecycleActionResult> {
  const context = await getActiveCompanyContext();
  if (!context) return { error: NO_ACTIVE_COMPANY_MESSAGE };
  if (!context.permissions.manageBilling) {
    return { error: "You do not have permission to manage the price book." };
  }

  const existing = await getServiceItemById(context.company.id, serviceItemId);
  if (!existing) return { error: "Service item not found." };

  const blockReason = getArchiveServiceItemBlockReason(existing);
  if (blockReason || !canArchiveServiceItem(existing)) {
    return { error: blockReason ?? "This item cannot be archived." };
  }

  const { serviceItem, error } = await archiveServiceItem(
    context.company.id,
    serviceItemId,
  );
  if (error || !serviceItem) {
    return { error: error ?? "We couldn't archive this item." };
  }

  revalidateServiceItemPaths();
  return { serviceItem };
}

export async function restoreServiceItemAction(
  serviceItemId: string,
): Promise<ServiceItemLifecycleActionResult> {
  const context = await getActiveCompanyContext();
  if (!context) return { error: NO_ACTIVE_COMPANY_MESSAGE };
  if (!context.permissions.manageBilling) {
    return { error: "You do not have permission to manage the price book." };
  }

  const existing = await getServiceItemById(context.company.id, serviceItemId);
  if (!existing) return { error: "Service item not found." };

  const blockReason = getRestoreServiceItemBlockReason(existing);
  if (blockReason || !canRestoreServiceItem(existing)) {
    return { error: blockReason ?? "This item cannot be restored." };
  }

  const { serviceItem, error } = await restoreServiceItem(
    context.company.id,
    serviceItemId,
  );
  if (error || !serviceItem) {
    return { error: error ?? "We couldn't restore this item." };
  }

  revalidateServiceItemPaths();
  return { serviceItem };
}

export async function moveServiceItemToTrashAction(
  serviceItemId: string,
): Promise<ServiceItemLifecycleActionResult> {
  const context = await getActiveCompanyContext();
  if (!context) return { error: NO_ACTIVE_COMPANY_MESSAGE };
  if (!context.permissions.manageBilling) {
    return { error: "You do not have permission to manage the price book." };
  }

  const existing = await getServiceItemById(context.company.id, serviceItemId);
  if (!existing) return { error: "Service item not found." };

  const dependencies = await getServiceItemDeleteDependencies(
    context.company.id,
    serviceItemId,
  );
  const blockReason = getMoveServiceItemToTrashBlockReason(existing, dependencies);
  if (blockReason || !canMoveServiceItemToTrash(existing, dependencies)) {
    return { error: blockReason ?? "This item cannot be moved to Recently Deleted." };
  }

  const { serviceItem, error } = await moveServiceItemToTrash(
    context.company.id,
    serviceItemId,
  );
  if (error || !serviceItem) {
    return { error: error ?? "We couldn't move this item to Recently Deleted." };
  }

  revalidateServiceItemPaths();
  return { serviceItem };
}

export async function restoreServiceItemFromTrashAction(
  serviceItemId: string,
): Promise<ServiceItemLifecycleActionResult> {
  const context = await getActiveCompanyContext();
  if (!context) return { error: NO_ACTIVE_COMPANY_MESSAGE };
  if (!context.permissions.manageBilling) {
    return { error: "You do not have permission to manage the price book." };
  }

  const existing = await getServiceItemById(context.company.id, serviceItemId);
  if (!existing) return { error: "Service item not found." };

  const blockReason = getRestoreServiceItemFromTrashBlockReason(existing);
  if (blockReason || !canRestoreServiceItemFromTrash(existing)) {
    return { error: blockReason ?? "This item cannot be restored." };
  }

  const { serviceItem, error } = await restoreServiceItemFromTrash(
    context.company.id,
    serviceItemId,
  );
  if (error || !serviceItem) {
    return { error: error ?? "We couldn't restore this item." };
  }

  revalidateServiceItemPaths();
  return { serviceItem };
}

export async function permanentlyDeleteServiceItemAction(
  serviceItemId: string,
): Promise<ServiceItemLifecycleActionResult> {
  const context = await getActiveCompanyContext();
  if (!context) return { error: NO_ACTIVE_COMPANY_MESSAGE };
  if (!context.permissions.manageBilling) {
    return { error: "You do not have permission to manage the price book." };
  }

  const existing = await getServiceItemById(context.company.id, serviceItemId);
  if (!existing) return { error: "Service item not found." };

  const dependencies = await getServiceItemDeleteDependencies(
    context.company.id,
    serviceItemId,
  );
  const blockReason = getPermanentDeleteServiceItemBlockReason(
    existing,
    dependencies,
  );
  if (blockReason || !canPermanentlyDeleteServiceItem(existing, dependencies)) {
    return { error: blockReason ?? "This item cannot be permanently deleted." };
  }

  const { success, error } = await permanentlyDeleteServiceItem(
    context.company.id,
    serviceItemId,
  );
  if (!success || error) {
    return { error: error ?? "We couldn't permanently delete this item." };
  }

  revalidateServiceItemPaths();
  return { deleted: true };
}

export async function getServiceItemLifecycleDepsAction(
  serviceItemId: string,
): Promise<{
  error?: string;
  dependencies?: Awaited<ReturnType<typeof getServiceItemDeleteDependencies>>;
}> {
  const context = await getActiveCompanyContext();
  if (!context) return { error: NO_ACTIVE_COMPANY_MESSAGE };
  if (!context.permissions.manageBilling) {
    return { error: "You do not have permission to manage the price book." };
  }

  const existing = await getServiceItemById(context.company.id, serviceItemId);
  if (!existing) return { error: "Service item not found." };

  const dependencies = await getServiceItemDeleteDependencies(
    context.company.id,
    serviceItemId,
  );

  return { dependencies };
}
