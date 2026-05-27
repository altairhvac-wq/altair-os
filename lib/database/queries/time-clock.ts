import { createClient } from "@/lib/supabase/server";
import { mapDatabaseError } from "@/lib/database/errors";
import type {
  TimeClockEntryInsert,
  TimeClockEntryRow,
  TimeClockEntryUpdate,
} from "@/lib/database/types/core-tables";
import type { TimeClockEntry } from "@/shared/types/time-clock";

type ProfileSummary = {
  full_name: string | null;
  email: string;
};

type TimeClockEntryRowWithProfile = TimeClockEntryRow & {
  user: ProfileSummary | null;
};

const TIME_CLOCK_ENTRY_SELECT = `
  *,
  user:profiles!time_clock_entries_user_id_fkey(full_name, email)
`;

function formatProfileName(profile: ProfileSummary | null | undefined): string {
  if (!profile) {
    return "Unknown";
  }

  return profile.full_name?.trim() || profile.email;
}

function mapTimeClockEntryRow(
  row: TimeClockEntryRowWithProfile,
): TimeClockEntry {
  return {
    id: row.id,
    companyId: row.company_id,
    userId: row.user_id,
    userName: formatProfileName(row.user),
    clockInAt: row.clock_in_at,
    clockOutAt: row.clock_out_at ?? undefined,
    status: row.status,
    notes: row.notes ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getOpenTimeClockEntryForUser(
  companyId: string,
  userId: string,
): Promise<{ entry: TimeClockEntry | null; error: string | null }> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("time_clock_entries")
    .select(TIME_CLOCK_ENTRY_SELECT)
    .eq("company_id", companyId)
    .eq("user_id", userId)
    .eq("status", "open")
    .maybeSingle();

  if (error) {
    console.error("[getOpenTimeClockEntryForUser] query failed:", {
      companyId,
      userId,
      code: error.code,
      message: error.message,
    });
    return { entry: null, error: mapDatabaseError(error) };
  }

  return {
    entry: data
      ? mapTimeClockEntryRow(data as TimeClockEntryRowWithProfile)
      : null,
    error: null,
  };
}

export async function listTimeClockEntries(
  companyId: string,
  options: { userId?: string; limit?: number } = {},
): Promise<TimeClockEntry[]> {
  const supabase = await createClient();
  const limit = options.limit ?? 100;

  let query = supabase
    .from("time_clock_entries")
    .select(TIME_CLOCK_ENTRY_SELECT)
    .eq("company_id", companyId)
    .order("clock_in_at", { ascending: false })
    .limit(limit);

  if (options.userId) {
    query = query.eq("user_id", options.userId);
  }

  const { data, error } = await query;

  if (error) {
    console.error("[listTimeClockEntries] query failed:", {
      companyId,
      code: error.code,
      message: error.message,
    });
    return [];
  }

  return ((data ?? []) as TimeClockEntryRowWithProfile[]).map(
    mapTimeClockEntryRow,
  );
}

export async function clockInTimeClockEntry(
  companyId: string,
  userId: string,
  notes?: string,
): Promise<{ entry: TimeClockEntry | null; error: string | null }> {
  const supabase = await createClient();

  const { entry: openEntry } = await getOpenTimeClockEntryForUser(
    companyId,
    userId,
  );

  if (openEntry) {
    return { entry: null, error: "You already have an open shift." };
  }

  const insert: TimeClockEntryInsert = {
    company_id: companyId,
    user_id: userId,
    notes: notes?.trim() || null,
  };

  const { data, error } = await supabase
    .from("time_clock_entries")
    .insert(insert)
    .select(TIME_CLOCK_ENTRY_SELECT)
    .single();

  if (error) {
    console.error("[clockInTimeClockEntry] insert failed:", {
      companyId,
      userId,
      code: error.code,
      message: error.message,
    });
    return { entry: null, error: mapDatabaseError(error) };
  }

  if (!data) {
    return { entry: null, error: "Failed to clock in." };
  }

  return {
    entry: mapTimeClockEntryRow(data as TimeClockEntryRowWithProfile),
    error: null,
  };
}

export async function clockOutTimeClockEntry(
  companyId: string,
  userId: string,
): Promise<{ entry: TimeClockEntry | null; error: string | null }> {
  const supabase = await createClient();

  const { entry: openEntry, error: openError } =
    await getOpenTimeClockEntryForUser(companyId, userId);

  if (openError) {
    return { entry: null, error: openError };
  }

  if (!openEntry) {
    return { entry: null, error: "You are not clocked in." };
  }

  const clockOutAt = new Date().toISOString();
  const update: TimeClockEntryUpdate = {
    clock_out_at: clockOutAt,
    status: "closed",
  };

  const { data, error } = await supabase
    .from("time_clock_entries")
    .update(update)
    .eq("company_id", companyId)
    .eq("id", openEntry.id)
    .eq("user_id", userId)
    .eq("status", "open")
    .select(TIME_CLOCK_ENTRY_SELECT)
    .single();

  if (error) {
    console.error("[clockOutTimeClockEntry] update failed:", {
      companyId,
      userId,
      entryId: openEntry.id,
      code: error.code,
      message: error.message,
    });
    return { entry: null, error: mapDatabaseError(error) };
  }

  if (!data) {
    return { entry: null, error: "Failed to clock out." };
  }

  return {
    entry: mapTimeClockEntryRow(data as TimeClockEntryRowWithProfile),
    error: null,
  };
}
