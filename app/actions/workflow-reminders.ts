"use server";

import { getActiveCompanyContext } from "@/lib/database/company-context";
import { NO_ACTIVE_COMPANY_MESSAGE } from "@/lib/database/errors";
import {
  completeWorkflowReminderByUser,
  dismissWorkflowReminder,
  getWorkflowReminderById,
  snoozeWorkflowReminder,
} from "@/lib/database/queries/workflow-reminders";
import { revalidateOperationalDashboard } from "@/lib/database/revalidation/operational-pages";

export type WorkflowReminderActionResult = {
  error?: string;
};

const SNOOZE_DAY_OPTIONS = [1, 3, 7] as const;
export type WorkflowReminderSnoozeDays =
  (typeof SNOOZE_DAY_OPTIONS)[number];

function assertWorkflowReminderManageAccess(
  context: NonNullable<Awaited<ReturnType<typeof getActiveCompanyContext>>>,
): string | null {
  if (!context.permissions.manageBilling) {
    return "You do not have permission to manage workflow reminders.";
  }

  return null;
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function revalidateWorkflowReminderPaths() {
  revalidateOperationalDashboard();
}

export async function snoozeWorkflowReminderAction(
  reminderId: string,
  days: WorkflowReminderSnoozeDays,
): Promise<WorkflowReminderActionResult> {
  const context = await getActiveCompanyContext();
  if (!context) {
    return { error: NO_ACTIVE_COMPANY_MESSAGE };
  }

  const permissionError = assertWorkflowReminderManageAccess(context);
  if (permissionError) {
    return { error: permissionError };
  }

  if (!reminderId.trim()) {
    return { error: "Reminder not found." };
  }

  if (!SNOOZE_DAY_OPTIONS.includes(days)) {
    return { error: "Invalid snooze duration." };
  }

  const existing = await getWorkflowReminderById(
    context.company.id,
    reminderId,
  );

  if (!existing) {
    return { error: "Reminder not found." };
  }

  if (existing.status !== "active") {
    return { error: "Only active reminders can be snoozed." };
  }

  const snoozedUntil = addDays(new Date(), days).toISOString();
  const { error } = await snoozeWorkflowReminder(
    context.company.id,
    reminderId,
    snoozedUntil,
  );

  if (error) {
    return { error };
  }

  revalidateWorkflowReminderPaths();
  return {};
}

export async function dismissWorkflowReminderAction(
  reminderId: string,
): Promise<WorkflowReminderActionResult> {
  const context = await getActiveCompanyContext();
  if (!context) {
    return { error: NO_ACTIVE_COMPANY_MESSAGE };
  }

  const permissionError = assertWorkflowReminderManageAccess(context);
  if (permissionError) {
    return { error: permissionError };
  }

  if (!reminderId.trim()) {
    return { error: "Reminder not found." };
  }

  const existing = await getWorkflowReminderById(
    context.company.id,
    reminderId,
  );

  if (!existing) {
    return { error: "Reminder not found." };
  }

  if (existing.status !== "active") {
    return { error: "Only active reminders can be dismissed." };
  }

  const dismissedAt = new Date().toISOString();
  const { error } = await dismissWorkflowReminder(
    context.company.id,
    reminderId,
    context.user.id,
    dismissedAt,
  );

  if (error) {
    return { error };
  }

  revalidateWorkflowReminderPaths();
  return {};
}

export async function completeWorkflowReminderAction(
  reminderId: string,
): Promise<WorkflowReminderActionResult> {
  const context = await getActiveCompanyContext();
  if (!context) {
    return { error: NO_ACTIVE_COMPANY_MESSAGE };
  }

  const permissionError = assertWorkflowReminderManageAccess(context);
  if (permissionError) {
    return { error: permissionError };
  }

  if (!reminderId.trim()) {
    return { error: "Reminder not found." };
  }

  const existing = await getWorkflowReminderById(
    context.company.id,
    reminderId,
  );

  if (!existing) {
    return { error: "Reminder not found." };
  }

  if (existing.status !== "active") {
    return { error: "Only active reminders can be completed." };
  }

  const completedAt = new Date().toISOString();
  const { error } = await completeWorkflowReminderByUser(
    context.company.id,
    reminderId,
    context.user.id,
    completedAt,
  );

  if (error) {
    return { error };
  }

  revalidateWorkflowReminderPaths();
  return {};
}
