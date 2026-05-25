"use server";

import { revalidatePath } from "next/cache";
import { getActiveCompanyContext } from "@/lib/database/company-context";
import {
  createServiceItem,
  setServiceItemActive,
  updateServiceItem,
} from "@/lib/database/queries/service-items";
import type {
  ServiceItem,
  ServiceItemFormData,
} from "@/shared/types/service-item";

export type ServiceItemActionResult = {
  error?: string;
  serviceItem?: ServiceItem;
};

function revalidateServiceItemPaths() {
  revalidatePath("/price-book");
  revalidatePath("/estimates");
}

export async function createServiceItemAction(
  data: ServiceItemFormData,
): Promise<ServiceItemActionResult> {
  const context = await getActiveCompanyContext();

  if (!context) {
    return { error: "No active company workspace." };
  }

  if (!context.permissions.manageBilling) {
    return { error: "You do not have permission to manage the price book." };
  }

  const { serviceItem, error } = await createServiceItem(
    context.company.id,
    data,
  );

  if (error || !serviceItem) {
    return { error: error ?? "Failed to create service item." };
  }

  revalidateServiceItemPaths();
  return { serviceItem };
}

export async function updateServiceItemAction(
  serviceItemId: string,
  data: ServiceItemFormData,
): Promise<ServiceItemActionResult> {
  const context = await getActiveCompanyContext();

  if (!context) {
    return { error: "No active company workspace." };
  }

  if (!context.permissions.manageBilling) {
    return { error: "You do not have permission to manage the price book." };
  }

  const { serviceItem, error } = await updateServiceItem(
    context.company.id,
    serviceItemId,
    data,
  );

  if (error || !serviceItem) {
    return { error: error ?? "Failed to update service item." };
  }

  revalidateServiceItemPaths();
  return { serviceItem };
}

export async function setServiceItemActiveAction(
  serviceItemId: string,
  isActive: boolean,
): Promise<ServiceItemActionResult> {
  const context = await getActiveCompanyContext();

  if (!context) {
    return { error: "No active company workspace." };
  }

  if (!context.permissions.manageBilling) {
    return { error: "You do not have permission to manage the price book." };
  }

  const { serviceItem, error } = await setServiceItemActive(
    context.company.id,
    serviceItemId,
    isActive,
  );

  if (error || !serviceItem) {
    return { error: error ?? "Failed to update service item status." };
  }

  revalidateServiceItemPaths();
  return { serviceItem };
}
