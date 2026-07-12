"use server";

import { revalidatePath } from "next/cache";
import { getActiveCompanyContext } from "@/lib/database/company-context";
import {
  clockInTimeClockEntry,
  clockOutTimeClockEntry,
  correctOpenShiftTimeClockEntry,
  getOpenTimeClockEntryForUser,
  listTimeClockEntries,
} from "@/lib/database/queries/time-clock";
import {
  canCorrectCompanyTimeEntries,
  canViewCompanyTimeEntries,
} from "@/lib/database/access-control";
import type { TimeClockEntry } from "@/shared/types/time-clock";

export type TimeClockActionResult = {
  error?: string;
  openEntry?: TimeClockEntry | null;
  entry?: TimeClockEntry;
  entries?: TimeClockEntry[];
};

function revalidateTimeClockPaths() {
  revalidatePath("/time-clock");
  revalidatePath("/time");
  revalidatePath("/reports");
  revalidatePath("/technician");
  revalidatePath("/tech/time");
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

  const canViewAll = canViewCompanyTimeEntries(context);
  const [{ entry: openEntry }, entries] = await Promise.all([
    getOpenTimeClockEntryForUser(context.company.id, context.user.id),
    listTimeClockEntries(context.company.id, {
      userId: canViewAll ? undefined : context.user.id,
      limit: 100,
    }),
  ]);

  return { openEntry, entries };
}

export async function correctOpenShiftAction(input: {
  entryId: string;
  endedAt: string;
  reason: string;
}): Promise<TimeClockActionResult> {
  const context = await getActiveCompanyContext();
  if (!context) return { error: "No active company workspace." };

  const { entry: openEntry } = await getOpenTimeClockEntryForUser(
    context.company.id,
    context.user.id,
  );
  const isOwnStaleShift =
    openEntry?.id === input.entryId &&
    Date.now() - Date.parse(openEntry.clockInAt) >= 12 * 60 * 60 * 1000;

  if (!canCorrectCompanyTimeEntries(context) && !isOwnStaleShift) {
    return { error: "You do not have permission to correct this shift." };
  }

  const result = await correctOpenShiftTimeClockEntry({
    companyId: context.company.id,
    actorId: context.user.id,
    ...input,
  });
  if (result.error || !result.entry) {
    return { error: result.error ?? "Failed to correct shift." };
  }

  revalidateTimeClockPaths();
  return { entry: result.entry, openEntry: null };
}
