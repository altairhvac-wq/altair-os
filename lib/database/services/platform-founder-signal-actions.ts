import "server-only";

import { createServiceRoleClient } from "@/lib/supabase/service";
import type { PlatformFounderSignalActionStatus } from "@/lib/database/types/platform-founder-signal-actions";
import {
  mapRowToFounderActionRecord,
  type PlatformFounderSignalActionRecord,
} from "@/shared/lib/platform-founder-signal-actions";
import type { PlatformPrioritySignalKind } from "@/shared/types/platform-admin";
import { isActionableFounderSignalKind } from "@/shared/lib/platform-signal-keys";

const MAX_NOTE_LENGTH = 2000;

export async function fetchPlatformFounderSignalActions(): Promise<
  PlatformFounderSignalActionRecord[]
> {
  const supabase = createServiceRoleClient();

  const { data, error } = await supabase
    .from("platform_founder_signal_actions")
    .select("*")
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("[platform-founder-signal-actions] fetch failed:", error.message);
    return [];
  }

  return (data ?? []).map(mapRowToFounderActionRecord);
}

export async function getPlatformFounderSignalActionByKey(
  signalKey: string,
): Promise<PlatformFounderSignalActionRecord | null> {
  const supabase = createServiceRoleClient();

  const { data, error } = await supabase
    .from("platform_founder_signal_actions")
    .select("*")
    .eq("signal_key", signalKey)
    .maybeSingle();

  if (error) {
    console.error("[platform-founder-signal-actions] get by key failed:", error.message);
    return null;
  }

  return data ? mapRowToFounderActionRecord(data) : null;
}

type UpsertFounderSignalActionInput = {
  signalKey: string;
  signalKind: PlatformPrioritySignalKind;
  signalTitleSnapshot: string;
  companyId?: string | null;
  companyNameSnapshot?: string | null;
  status: PlatformFounderSignalActionStatus;
  note?: string | null;
  snoozedUntil?: string | null;
  contactedAt?: string | null;
  resolvedAt?: string | null;
  resolvedFingerprint?: string | null;
  userId: string;
};

function validateSignalKind(kind: PlatformPrioritySignalKind): string | null {
  if (!isActionableFounderSignalKind(kind)) {
    return "This signal does not support founder actions.";
  }

  return null;
}

function validateNote(note: string | null | undefined): string | null {
  if (note == null || note.trim() === "") {
    return null;
  }

  if (note.length > MAX_NOTE_LENGTH) {
    return `Note must be ${MAX_NOTE_LENGTH} characters or fewer.`;
  }

  return null;
}

export async function upsertPlatformFounderSignalAction(
  input: UpsertFounderSignalActionInput,
): Promise<{ action: PlatformFounderSignalActionRecord | null; error: string | null }> {
  const kindError = validateSignalKind(input.signalKind);
  if (kindError) {
    return { action: null, error: kindError };
  }

  const noteError = validateNote(input.note ?? null);
  if (noteError) {
    return { action: null, error: noteError };
  }

  const trimmedKey = input.signalKey.trim();
  if (!trimmedKey) {
    return { action: null, error: "Signal key is required." };
  }

  const trimmedTitle = input.signalTitleSnapshot.trim().slice(0, 500);
  if (!trimmedTitle) {
    return { action: null, error: "Signal title is required." };
  }

  const supabase = createServiceRoleClient();
  const nowIso = new Date().toISOString();

  const payload = {
    signal_key: trimmedKey,
    signal_kind: input.signalKind,
    signal_title_snapshot: trimmedTitle,
    company_id: input.companyId ?? null,
    company_name_snapshot: input.companyNameSnapshot?.trim().slice(0, 200) ?? null,
    status: input.status,
    note: input.note?.trim() || null,
    snoozed_until: input.snoozedUntil ?? null,
    contacted_at: input.contactedAt ?? null,
    resolved_at: input.resolvedAt ?? null,
    resolved_fingerprint: input.resolvedFingerprint ?? null,
    updated_by: input.userId,
  };

  const existing = await getPlatformFounderSignalActionByKey(trimmedKey);

  if (existing) {
    const { data, error } = await supabase
      .from("platform_founder_signal_actions")
      .update(payload)
      .eq("id", existing.id)
      .select("*")
      .single();

    if (error) {
      console.error("[platform-founder-signal-actions] update failed:", error.message);
      return { action: null, error: error.message };
    }

    return { action: mapRowToFounderActionRecord(data), error: null };
  }

  const { data, error } = await supabase
    .from("platform_founder_signal_actions")
    .insert({
      ...payload,
      created_by: input.userId,
      created_at: nowIso,
    })
    .select("*")
    .single();

  if (error) {
    console.error("[platform-founder-signal-actions] insert failed:", error.message);
    return { action: null, error: error.message };
  }

  return { action: mapRowToFounderActionRecord(data), error: null };
}

export async function markPlatformSignalContacted(
  input: Omit<UpsertFounderSignalActionInput, "status" | "snoozedUntil" | "resolvedAt">,
): Promise<{ action: PlatformFounderSignalActionRecord | null; error: string | null }> {
  const nowIso = new Date().toISOString();

  return upsertPlatformFounderSignalAction({
    ...input,
    status: "contacted",
    contactedAt: nowIso,
    snoozedUntil: null,
    resolvedAt: null,
    resolvedFingerprint: null,
  });
}

export async function snoozePlatformSignal(
  input: Omit<UpsertFounderSignalActionInput, "status" | "contactedAt" | "resolvedAt"> & {
    snoozedUntil: string;
  },
): Promise<{ action: PlatformFounderSignalActionRecord | null; error: string | null }> {
  return upsertPlatformFounderSignalAction({
    ...input,
    status: "snoozed",
    contactedAt: null,
    resolvedAt: null,
    resolvedFingerprint: null,
  });
}

export async function resolvePlatformSignal(
  input: Omit<UpsertFounderSignalActionInput, "status" | "snoozedUntil" | "contactedAt"> & {
    resolvedFingerprint: string;
  },
): Promise<{ action: PlatformFounderSignalActionRecord | null; error: string | null }> {
  const nowIso = new Date().toISOString();

  return upsertPlatformFounderSignalAction({
    ...input,
    status: "resolved",
    resolvedAt: nowIso,
    snoozedUntil: null,
    contactedAt: null,
  });
}

export async function reopenPlatformSignal(
  signalKey: string,
  userId: string,
): Promise<{ action: PlatformFounderSignalActionRecord | null; error: string | null }> {
  const existing = await getPlatformFounderSignalActionByKey(signalKey);

  if (!existing) {
    return { action: null, error: "No founder action record found for this signal." };
  }

  const supabase = createServiceRoleClient();

  const { data, error } = await supabase
    .from("platform_founder_signal_actions")
    .update({
      status: "open",
      snoozed_until: null,
      contacted_at: null,
      resolved_at: null,
      resolved_fingerprint: null,
      updated_by: userId,
    })
    .eq("id", existing.id)
    .select("*")
    .single();

  if (error) {
    console.error("[platform-founder-signal-actions] reopen failed:", error.message);
    return { action: null, error: error.message };
  }

  return { action: mapRowToFounderActionRecord(data), error: null };
}

export async function updatePlatformSignalNote(
  input: Omit<UpsertFounderSignalActionInput, "status" | "snoozedUntil" | "contactedAt" | "resolvedAt"> & {
    preserveStatus?: PlatformFounderSignalActionStatus;
  },
): Promise<{ action: PlatformFounderSignalActionRecord | null; error: string | null }> {
  const existing = await getPlatformFounderSignalActionByKey(input.signalKey);
  const status = input.preserveStatus ?? existing?.status ?? "open";

  return upsertPlatformFounderSignalAction({
    ...input,
    status,
    snoozedUntil: existing?.snoozedUntil ?? null,
    contactedAt: existing?.contactedAt ?? null,
    resolvedAt: existing?.resolvedAt ?? null,
    resolvedFingerprint: existing?.resolvedFingerprint ?? null,
  });
}
