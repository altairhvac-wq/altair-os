"use server";

import { revalidatePath } from "next/cache";
import { getActiveCompanyContext } from "@/lib/database/company-context";
import {
  endBreak,
  getCurrentTimeState,
  getTodayTimeEntries,
  startBreak,
  startClock,
  startJobLabor,
  stopClock,
  stopJobLabor,
} from "@/lib/database/services/time-tracking";
import type {
  TechnicianTimeStateSnapshot,
  TimeEntry,
  TodayTimeSummary,
} from "@/shared/types/time-entry";

export type TimeEntryActionResult = {
  error?: string;
  state?: TechnicianTimeStateSnapshot;
  entry?: TimeEntry;
  entries?: TimeEntry[];
  summary?: TodayTimeSummary;
};

function revalidateTimePaths() {
  revalidatePath("/time");
  revalidatePath("/technician");
  revalidatePath("/tech/time");
}

async function finalizeOwnTimeAction(
  context: NonNullable<Awaited<ReturnType<typeof getActiveCompanyContext>>>,
  actionResult: TimeEntryActionResult,
): Promise<TimeEntryActionResult> {
  if (actionResult.error) {
    return { error: actionResult.error };
  }

  const { entries, summary } = await getTodayTimeEntries(
    context.company.id,
    context.user.id,
  );

  return {
    ...actionResult,
    entries,
    summary,
  };
}

function canManageOwnTime(context: NonNullable<Awaited<ReturnType<typeof getActiveCompanyContext>>>) {
  return context.permissions.viewAssignedJobs;
}

function canViewCompanyTimeEntries(
  context: NonNullable<Awaited<ReturnType<typeof getActiveCompanyContext>>>,
) {
  return (
    context.permissions.manageBilling ||
    context.permissions.dispatchJobs ||
    context.permissions.manageCompany
  );
}

async function assertOwnTimePermission(): Promise<{
  error?: string;
  context?: NonNullable<Awaited<ReturnType<typeof getActiveCompanyContext>>>;
}> {
  const context = await getActiveCompanyContext();

  if (!context) {
    return { error: "No active company workspace." };
  }

  if (!canManageOwnTime(context)) {
    return { error: "You do not have permission to manage time entries." };
  }

  return { context };
}

export async function getTechnicianTimeDashboardAction(): Promise<TimeEntryActionResult> {
  const result = await assertOwnTimePermission();
  if (result.error || !result.context) {
    return { error: result.error };
  }

  const { context } = result;
  const state = await getCurrentTimeState(context.company.id, context.user.id);
  const { entries, summary } = await getTodayTimeEntries(
    context.company.id,
    context.user.id,
  );

  return { state, entries, summary };
}

export async function startClockAction(): Promise<TimeEntryActionResult> {
  const result = await assertOwnTimePermission();
  if (result.error || !result.context) {
    return { error: result.error };
  }

  const { context } = result;
  const actionResult = await startClock({
    companyId: context.company.id,
    technicianId: context.user.id,
    actorId: context.user.id,
  });

  if (actionResult.error) {
    return { error: actionResult.error };
  }

  revalidateTimePaths();
  return finalizeOwnTimeAction(context, actionResult);
}

export async function stopClockAction(): Promise<TimeEntryActionResult> {
  const result = await assertOwnTimePermission();
  if (result.error || !result.context) {
    return { error: result.error };
  }

  const { context } = result;
  const actionResult = await stopClock({
    companyId: context.company.id,
    technicianId: context.user.id,
    actorId: context.user.id,
  });

  if (actionResult.error) {
    return { error: actionResult.error };
  }

  revalidateTimePaths();
  return finalizeOwnTimeAction(context, actionResult);
}

export async function startBreakAction(): Promise<TimeEntryActionResult> {
  const result = await assertOwnTimePermission();
  if (result.error || !result.context) {
    return { error: result.error };
  }

  const { context } = result;
  const actionResult = await startBreak({
    companyId: context.company.id,
    technicianId: context.user.id,
    actorId: context.user.id,
  });

  if (actionResult.error) {
    return { error: actionResult.error };
  }

  revalidateTimePaths();
  return finalizeOwnTimeAction(context, actionResult);
}

export async function endBreakAction(): Promise<TimeEntryActionResult> {
  const result = await assertOwnTimePermission();
  if (result.error || !result.context) {
    return { error: result.error };
  }

  const { context } = result;
  const actionResult = await endBreak({
    companyId: context.company.id,
    technicianId: context.user.id,
    actorId: context.user.id,
  });

  if (actionResult.error) {
    return { error: actionResult.error };
  }

  revalidateTimePaths();
  return finalizeOwnTimeAction(context, actionResult);
}

export async function startJobLaborAction(
  jobId: string,
): Promise<TimeEntryActionResult> {
  const result = await assertOwnTimePermission();
  if (result.error || !result.context) {
    return { error: result.error };
  }

  const { context } = result;
  const actionResult = await startJobLabor({
    companyId: context.company.id,
    technicianId: context.user.id,
    actorId: context.user.id,
    jobId,
  });

  if (actionResult.error) {
    return { error: actionResult.error };
  }

  revalidateTimePaths();
  revalidatePath(`/jobs/${jobId}`);
  return finalizeOwnTimeAction(context, actionResult);
}

export async function stopJobLaborAction(
  jobId?: string,
): Promise<TimeEntryActionResult> {
  const result = await assertOwnTimePermission();
  if (result.error || !result.context) {
    return { error: result.error };
  }

  const { context } = result;
  const actionResult = await stopJobLabor({
    companyId: context.company.id,
    technicianId: context.user.id,
    actorId: context.user.id,
    jobId,
  });

  if (actionResult.error) {
    return { error: actionResult.error };
  }

  revalidateTimePaths();
  if (jobId) {
    revalidatePath(`/jobs/${jobId}`);
  }
  return finalizeOwnTimeAction(context, actionResult);
}

export async function getCompanyTimeTrackingContextAction(): Promise<{
  error?: string;
  canView?: boolean;
}> {
  const context = await getActiveCompanyContext();

  if (!context) {
    return { error: "No active company workspace." };
  }

  return { canView: canViewCompanyTimeEntries(context) };
}
