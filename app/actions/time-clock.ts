"use server";

import { revalidatePath } from "next/cache";
import { getActiveCompanyContext } from "@/lib/database/company-context";
import {
  clockInTimeClockEntry,
  clockOutTimeClockEntry,
  getOpenTimeClockEntryForUser,
  listTimeClockEntries,
} from "@/lib/database/queries/time-clock";
import type { TimeClockEntry } from "@/shared/types/time-clock";
import { canViewCompanyTimeClockEntries } from "@/shared/types/time-clock";

export type TimeClockActionResult = {
  error?: string;
  openEntry?: TimeClockEntry | null;
  entry?: TimeClockEntry;
  entries?: TimeClockEntry[];
};

function revalidateTimeClockPaths() {
  revalidatePath("/time-clock");
}

export async function clockInAction(
  notes?: string,
): Promise<TimeClockActionResult> {
  const context = await getActiveCompanyContext();

  if (!context) {
    return { error: "No active company workspace." };
  }

  const { entry, error } = await clockInTimeClockEntry(
    context.company.id,
    context.user.id,
    notes,
  );

  if (error || !entry) {
    return { error: error ?? "Failed to clock in." };
  }

  revalidateTimeClockPaths();
  return { entry, openEntry: entry };
}

export async function clockOutAction(): Promise<TimeClockActionResult> {
  const context = await getActiveCompanyContext();

  if (!context) {
    return { error: "No active company workspace." };
  }

  const { entry, error } = await clockOutTimeClockEntry(
    context.company.id,
    context.user.id,
  );

  if (error || !entry) {
    return { error: error ?? "Failed to clock out." };
  }

  revalidateTimeClockPaths();
  return { entry, openEntry: null };
}

export async function getTimeClockDashboardAction(): Promise<TimeClockActionResult> {
  const context = await getActiveCompanyContext();

  if (!context) {
    return { error: "No active company workspace." };
  }

  const canViewAll = canViewCompanyTimeClockEntries(context.role);
  const [{ entry: openEntry }, entries] = await Promise.all([
    getOpenTimeClockEntryForUser(context.company.id, context.user.id),
    listTimeClockEntries(context.company.id, {
      userId: canViewAll ? undefined : context.user.id,
      limit: 100,
    }),
  ]);

  return { openEntry, entries };
}
