"use server";

import { revalidatePath } from "next/cache";
import { getActiveCompanyContext } from "@/lib/database/company-context";
import {
  createAlphaTrackerItem,
  updateAlphaTrackerItem,
  updateAlphaTrackerItemStatus,
} from "@/lib/database/queries/alpha-tracker-items";
import type {
  AlphaTrackerItem,
  AlphaTrackerItemEditFormData,
  AlphaTrackerItemFormData,
  AlphaTrackerStatus,
} from "@/shared/types/alpha-tracker";

export type AlphaTrackerActionResult = {
  error?: string;
  item?: AlphaTrackerItem;
};

function revalidateAlphaTrackerPaths() {
  revalidatePath("/alpha-tracker");
}

export async function createAlphaTrackerItemAction(
  data: AlphaTrackerItemFormData,
): Promise<AlphaTrackerActionResult> {
  const context = await getActiveCompanyContext();

  if (!context) {
    return { error: "No active company workspace." };
  }

  if (!context.permissions.manageCompany) {
    return { error: "You do not have permission to manage feedback items." };
  }

  if (!data.title.trim()) {
    return { error: "Title is required." };
  }

  const { item, error } = await createAlphaTrackerItem(
    context.company.id,
    context.user.id,
    data,
  );

  if (error || !item) {
    return { error: error ?? "Failed to create tracker item." };
  }

  revalidateAlphaTrackerPaths();
  return { item };
}

export async function updateAlphaTrackerItemAction(
  itemId: string,
  data: AlphaTrackerItemEditFormData,
): Promise<AlphaTrackerActionResult> {
  const context = await getActiveCompanyContext();

  if (!context) {
    return { error: "No active company workspace." };
  }

  if (!context.permissions.manageCompany) {
    return { error: "You do not have permission to manage feedback items." };
  }

  if (!data.title.trim()) {
    return { error: "Title is required." };
  }

  const { item, error } = await updateAlphaTrackerItem(
    context.company.id,
    itemId,
    data,
  );

  if (error || !item) {
    return { error: error ?? "Failed to update tracker item." };
  }

  revalidateAlphaTrackerPaths();
  return { item };
}

export async function updateAlphaTrackerItemStatusAction(
  itemId: string,
  status: AlphaTrackerStatus,
): Promise<AlphaTrackerActionResult> {
  const context = await getActiveCompanyContext();

  if (!context) {
    return { error: "No active company workspace." };
  }

  if (!context.permissions.manageCompany) {
    return { error: "You do not have permission to manage feedback items." };
  }

  const { item, error } = await updateAlphaTrackerItemStatus(
    context.company.id,
    itemId,
    status,
  );

  if (error || !item) {
    return { error: error ?? "Failed to update tracker item status." };
  }

  revalidateAlphaTrackerPaths();
  return { item };
}
