"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/database/auth";
import { canAccessPlatformAdmin } from "@/lib/database/platform-admin";
import {
  markPlatformSignalContacted,
  reopenPlatformSignal,
  resolvePlatformSignal,
  snoozePlatformSignal,
  updatePlatformSignalNote,
} from "@/lib/database/services/platform-founder-signal-actions";
import { isActionableFounderSignalKind } from "@/shared/lib/platform-signal-keys";
import type { PlatformPrioritySignalKind } from "@/shared/types/platform-admin";

export type PlatformFounderSignalActionResult = {
  error?: string;
  success?: string;
};

const SNOOZE_DAY_OPTIONS = [1, 3, 7] as const;
export type PlatformFounderSignalSnoozeDays = (typeof SNOOZE_DAY_OPTIONS)[number];

const MAX_NOTE_LENGTH = 2000;

function revalidatePlatformPaths() {
  revalidatePath("/platform");
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

async function assertPlatformAdmin() {
  const user = await getCurrentUser();

  if (!user || !canAccessPlatformAdmin(user)) {
    return { user: null, error: "You do not have permission to manage founder signals." };
  }

  return { user, error: null };
}

type SignalActionPayload = {
  signalKey: string;
  signalKind: PlatformPrioritySignalKind;
  signalTitleSnapshot: string;
  companyId?: string | null;
  companyNameSnapshot?: string | null;
  fingerprint: string;
  note?: string | null;
};

function validatePayload(payload: SignalActionPayload): string | null {
  if (!payload.signalKey.trim()) {
    return "Signal key is required.";
  }

  if (!isActionableFounderSignalKind(payload.signalKind)) {
    return "This signal does not support founder actions.";
  }

  if (!payload.signalTitleSnapshot.trim()) {
    return "Signal title is required.";
  }

  if (!payload.fingerprint.trim()) {
    return "Signal fingerprint is required.";
  }

  if (payload.note && payload.note.length > MAX_NOTE_LENGTH) {
    return `Note must be ${MAX_NOTE_LENGTH} characters or fewer.`;
  }

  return null;
}

export async function markPlatformSignalContactedAction(
  payload: SignalActionPayload,
): Promise<PlatformFounderSignalActionResult> {
  const auth = await assertPlatformAdmin();
  if (auth.error || !auth.user) {
    return { error: auth.error ?? "Unauthorized." };
  }

  const validationError = validatePayload(payload);

  if (validationError) {
    return { error: validationError };
  }

  const { action, error } = await markPlatformSignalContacted({
    signalKey: payload.signalKey,
    signalKind: payload.signalKind,
    signalTitleSnapshot: payload.signalTitleSnapshot,
    companyId: payload.companyId,
    companyNameSnapshot: payload.companyNameSnapshot,
    note: payload.note,
    userId: auth.user.id,
  });

  if (error || !action) {
    return { error: error ?? "Failed to mark signal as contacted." };
  }

  revalidatePlatformPaths();
  return { success: "Marked as contacted." };
}

export async function snoozePlatformSignalAction(
  payload: SignalActionPayload & { days: PlatformFounderSignalSnoozeDays },
): Promise<PlatformFounderSignalActionResult> {
  const auth = await assertPlatformAdmin();
  if (auth.error || !auth.user) {
    return { error: auth.error ?? "Unauthorized." };
  }

  const validationError = validatePayload(payload);

  if (validationError) {
    return { error: validationError };
  }

  if (!SNOOZE_DAY_OPTIONS.includes(payload.days)) {
    return { error: "Invalid snooze duration." };
  }

  const snoozedUntil = addDays(new Date(), payload.days).toISOString();

  const { action, error } = await snoozePlatformSignal({
    signalKey: payload.signalKey,
    signalKind: payload.signalKind,
    signalTitleSnapshot: payload.signalTitleSnapshot,
    companyId: payload.companyId,
    companyNameSnapshot: payload.companyNameSnapshot,
    note: payload.note,
    snoozedUntil,
    userId: auth.user.id,
  });

  if (error || !action) {
    return { error: error ?? "Failed to snooze signal." };
  }

  revalidatePlatformPaths();
  return { success: `Snoozed for ${payload.days} day${payload.days === 1 ? "" : "s"}.` };
}

export async function resolvePlatformSignalAction(
  payload: SignalActionPayload,
): Promise<PlatformFounderSignalActionResult> {
  const auth = await assertPlatformAdmin();
  if (auth.error || !auth.user) {
    return { error: auth.error ?? "Unauthorized." };
  }

  const validationError = validatePayload(payload);

  if (validationError) {
    return { error: validationError };
  }

  const { action, error } = await resolvePlatformSignal({
    signalKey: payload.signalKey,
    signalKind: payload.signalKind,
    signalTitleSnapshot: payload.signalTitleSnapshot,
    companyId: payload.companyId,
    companyNameSnapshot: payload.companyNameSnapshot,
    note: payload.note,
    resolvedFingerprint: payload.fingerprint,
    userId: auth.user.id,
  });

  if (error || !action) {
    return { error: error ?? "Failed to resolve signal." };
  }

  revalidatePlatformPaths();
  return { success: "Marked as resolved." };
}

export async function reopenPlatformSignalAction(
  signalKey: string,
): Promise<PlatformFounderSignalActionResult> {
  const auth = await assertPlatformAdmin();
  if (auth.error || !auth.user) {
    return { error: auth.error ?? "Unauthorized." };
  }

  if (!signalKey.trim()) {
    return { error: "Signal key is required." };
  }

  const { action, error } = await reopenPlatformSignal(signalKey, auth.user.id);

  if (error || !action) {
    return { error: error ?? "Failed to reopen signal." };
  }

  revalidatePlatformPaths();
  return { success: "Signal reopened." };
}

export async function updatePlatformSignalNoteAction(
  payload: SignalActionPayload,
): Promise<PlatformFounderSignalActionResult> {
  const auth = await assertPlatformAdmin();
  if (auth.error || !auth.user) {
    return { error: auth.error ?? "Unauthorized." };
  }

  const validationError = validatePayload(payload);

  if (validationError) {
    return { error: validationError };
  }

  const { action, error } = await updatePlatformSignalNote({
    signalKey: payload.signalKey,
    signalKind: payload.signalKind,
    signalTitleSnapshot: payload.signalTitleSnapshot,
    companyId: payload.companyId,
    companyNameSnapshot: payload.companyNameSnapshot,
    note: payload.note,
    userId: auth.user.id,
  });

  if (error || !action) {
    return { error: error ?? "Failed to update note." };
  }

  revalidatePlatformPaths();
  return { success: "Note saved." };
}
