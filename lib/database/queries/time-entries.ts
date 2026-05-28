import { createClient } from "@/lib/supabase/server";
import { mapDatabaseError } from "@/lib/database/errors";
import { getDayBoundsInTimeZone } from "@/shared/lib/datetime";
import type {
  TimeEntryInsert,
  TimeEntryRow,
  TimeEntryUpdate,
} from "@/lib/database/types/core-tables";
import type { TimeEntry, TimeEntryType } from "@/shared/types/time-entry";

import {
  resolveSubjectAttributionName,
  type ProfileSummary,
} from "@/shared/lib/profile-attribution";

type JobSummary = {
  job_number: string;
};

type TimeEntryRowWithRelations = TimeEntryRow & {
  technician: ProfileSummary | null;
  job: JobSummary | null;
};

export function mapTimeEntryRow(row: TimeEntryRowWithRelations): TimeEntry {
  return {
    id: row.id,
    companyId: row.company_id,
    technicianId: row.technician_id,
    technicianName: resolveSubjectAttributionName({
      profile: row.technician,
      subjectUserId: row.technician_id,
    }),
    jobId: row.job_id ?? undefined,
    jobNumber: row.job?.job_number,
    entryType: row.entry_type,
    startedAt: row.started_at,
    endedAt: row.ended_at ?? undefined,
    durationMinutes: row.duration_minutes ?? undefined,
    notes: row.notes ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const TIME_ENTRY_SELECT = `
  *,
  technician:profiles!time_entries_technician_id_fkey(full_name, email),
  job:jobs(job_number)
`;

function getStartOfTodayIso(timeZone?: string): string {
  const { start } = getDayBoundsInTimeZone(timeZone);
  return start;
}

export async function getActiveTimeEntryForTechnician(
  companyId: string,
  technicianId: string,
): Promise<{ entry: TimeEntry | null; error: string | null }> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("time_entries")
    .select(TIME_ENTRY_SELECT)
    .eq("company_id", companyId)
    .eq("technician_id", technicianId)
    .is("ended_at", null)
    .maybeSingle();

  if (error) {
    console.error("[getActiveTimeEntryForTechnician] query failed:", {
      companyId,
      technicianId,
      code: error.code,
      message: error.message,
    });
    return { entry: null, error: mapDatabaseError(error) };
  }

  return {
    entry: data ? mapTimeEntryRow(data as TimeEntryRowWithRelations) : null,
    error: null,
  };
}

export async function getTodayTimeEntriesForTechnician(
  companyId: string,
  technicianId: string,
  timeZone?: string,
): Promise<{ entries: TimeEntry[]; error: string | null }> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("time_entries")
    .select(TIME_ENTRY_SELECT)
    .eq("company_id", companyId)
    .eq("technician_id", technicianId)
    .gte("started_at", getStartOfTodayIso(timeZone))
    .order("started_at", { ascending: false });

  if (error) {
    console.error("[getTodayTimeEntriesForTechnician] query failed:", {
      companyId,
      technicianId,
      code: error.code,
      message: error.message,
    });
    return { entries: [], error: mapDatabaseError(error) };
  }

  return {
    entries: (data ?? []).map((row) =>
      mapTimeEntryRow(row as TimeEntryRowWithRelations),
    ),
    error: null,
  };
}

export async function listTimeEntries(
  companyId: string,
  options: {
    technicianId?: string;
    jobId?: string;
    entryType?: TimeEntryType;
    limit?: number;
  } = {},
): Promise<TimeEntry[]> {
  const supabase = await createClient();

  let query = supabase
    .from("time_entries")
    .select(TIME_ENTRY_SELECT)
    .eq("company_id", companyId)
    .order("started_at", { ascending: false });

  if (options.technicianId) {
    query = query.eq("technician_id", options.technicianId);
  }

  if (options.jobId) {
    query = query.eq("job_id", options.jobId);
  }

  if (options.entryType) {
    query = query.eq("entry_type", options.entryType);
  }

  if (options.limit) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;

  if (error) {
    console.error("[listTimeEntries] query failed:", {
      companyId,
      options,
      code: error.code,
      message: error.message,
    });
    return [];
  }

  return (data ?? []).map((row) =>
    mapTimeEntryRow(row as TimeEntryRowWithRelations),
  );
}

export async function listJobLaborEntriesForJob(
  companyId: string,
  jobId: string,
): Promise<TimeEntry[]> {
  return listTimeEntries(companyId, { jobId, entryType: "job_labor" });
}

export async function listOpenJobLaborEntriesForJob(
  companyId: string,
  jobId: string,
): Promise<TimeEntry[]> {
  const entries = await listJobLaborEntriesForJob(companyId, jobId);
  return entries.filter((entry) => entry.endedAt == null);
}

export async function listActiveTechnicianTimeEntries(
  companyId: string,
): Promise<TimeEntry[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("time_entries")
    .select(TIME_ENTRY_SELECT)
    .eq("company_id", companyId)
    .is("ended_at", null)
    .order("started_at", { ascending: false });

  if (error) {
    console.error("[listActiveTechnicianTimeEntries] query failed:", {
      companyId,
      code: error.code,
      message: error.message,
    });
    return [];
  }

  return (data ?? []).map((row) =>
    mapTimeEntryRow(row as TimeEntryRowWithRelations),
  );
}

export async function createTimeEntry(
  input: TimeEntryInsert,
): Promise<{ entry: TimeEntry | null; error: string | null }> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("time_entries")
    .insert({
      company_id: input.company_id,
      technician_id: input.technician_id,
      job_id: input.job_id ?? null,
      entry_type: input.entry_type,
      started_at: input.started_at ?? new Date().toISOString(),
      ended_at: input.ended_at ?? null,
      duration_minutes: input.duration_minutes ?? null,
      notes: input.notes ?? null,
    })
    .select(TIME_ENTRY_SELECT)
    .single();

  if (error) {
    console.error("[createTimeEntry] insert failed:", {
      companyId: input.company_id,
      technicianId: input.technician_id,
      entryType: input.entry_type,
      code: error.code,
      message: error.message,
    });

    if (
      error.code === "23505" &&
      error.message?.includes("time_entries_one_active_per_technician_idx")
    ) {
      return {
        entry: null,
        error: "You already have an active time entry.",
      };
    }

    return { entry: null, error: mapDatabaseError(error) };
  }

  return {
    entry: mapTimeEntryRow(data as TimeEntryRowWithRelations),
    error: null,
  };
}

export async function closeTimeEntry(
  companyId: string,
  entryId: string,
  endedAt: string,
  durationMinutes: number,
  notes?: string,
): Promise<{ entry: TimeEntry | null; error: string | null }> {
  const supabase = await createClient();

  const update: TimeEntryUpdate = {
    ended_at: endedAt,
    duration_minutes: durationMinutes,
  };

  if (notes !== undefined) {
    update.notes = notes;
  }

  const { data, error } = await supabase
    .from("time_entries")
    .update(update)
    .eq("company_id", companyId)
    .eq("id", entryId)
    .is("ended_at", null)
    .select(TIME_ENTRY_SELECT)
    .maybeSingle();

  if (error) {
    console.error("[closeTimeEntry] update failed:", {
      companyId,
      entryId,
      code: error.code,
      message: error.message,
    });
    return { entry: null, error: mapDatabaseError(error) };
  }

  if (!data) {
    return { entry: null, error: "Active time entry not found." };
  }

  return {
    entry: mapTimeEntryRow(data as TimeEntryRowWithRelations),
    error: null,
  };
}

export async function getTimeEntryById(
  companyId: string,
  entryId: string,
): Promise<TimeEntry | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("time_entries")
    .select(TIME_ENTRY_SELECT)
    .eq("company_id", companyId)
    .eq("id", entryId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return mapTimeEntryRow(data as TimeEntryRowWithRelations);
}

export function mapEntryTypeToTimeState(
  entryType: TimeEntryType,
): "clocked_in" | "on_break" | "working_job" {
  switch (entryType) {
    case "break":
      return "on_break";
    case "job_labor":
      return "working_job";
    default:
      return "clocked_in";
  }
}
