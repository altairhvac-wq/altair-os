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

export type TechnicianOpenTimeEntries = {
  clock: TimeEntry | null;
  jobLabor: TimeEntry | null;
  breakEntry: TimeEntry | null;
};

async function getOpenTimeEntryForTechnicianByType(
  companyId: string,
  technicianId: string,
  entryType: TimeEntryType,
): Promise<{ entry: TimeEntry | null; error: string | null }> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("time_entries")
    .select(TIME_ENTRY_SELECT)
    .eq("company_id", companyId)
    .eq("technician_id", technicianId)
    .eq("entry_type", entryType)
    .is("ended_at", null)
    .maybeSingle();

  if (error) {
    console.error("[getOpenTimeEntryForTechnicianByType] query failed:", {
      companyId,
      technicianId,
      entryType,
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

export async function getOpenClockEntryForTechnician(
  companyId: string,
  technicianId: string,
): Promise<{ entry: TimeEntry | null; error: string | null }> {
  return getOpenTimeEntryForTechnicianByType(companyId, technicianId, "clock");
}

export async function getOpenJobLaborEntryForTechnician(
  companyId: string,
  technicianId: string,
): Promise<{ entry: TimeEntry | null; error: string | null }> {
  return getOpenTimeEntryForTechnicianByType(
    companyId,
    technicianId,
    "job_labor",
  );
}

export async function getOpenBreakEntryForTechnician(
  companyId: string,
  technicianId: string,
): Promise<{ entry: TimeEntry | null; error: string | null }> {
  return getOpenTimeEntryForTechnicianByType(companyId, technicianId, "break");
}

export async function getTechnicianOpenTimeEntries(
  companyId: string,
  technicianId: string,
): Promise<{ entries: TechnicianOpenTimeEntries; error: string | null }> {
  const [clockResult, jobLaborResult, breakResult] = await Promise.all([
    getOpenClockEntryForTechnician(companyId, technicianId),
    getOpenJobLaborEntryForTechnician(companyId, technicianId),
    getOpenBreakEntryForTechnician(companyId, technicianId),
  ]);

  const error =
    clockResult.error ?? jobLaborResult.error ?? breakResult.error ?? null;

  if (error) {
    return {
      entries: { clock: null, jobLabor: null, breakEntry: null },
      error,
    };
  }

  return {
    entries: {
      clock: clockResult.entry,
      jobLabor: jobLaborResult.entry,
      breakEntry: breakResult.entry,
    },
    error: null,
  };
}

/** @deprecated Use getTechnicianOpenTimeEntries — returns the highest-priority open segment. */
export async function getActiveTimeEntryForTechnician(
  companyId: string,
  technicianId: string,
): Promise<{ entry: TimeEntry | null; error: string | null }> {
  const { entries, error } = await getTechnicianOpenTimeEntries(
    companyId,
    technicianId,
  );

  if (error) {
    return { entry: null, error };
  }

  const entry =
    entries.breakEntry ?? entries.jobLabor ?? entries.clock ?? null;

  return { entry, error: null };
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

function mapActiveEntryConstraintError(entryType: TimeEntryType): string {
  switch (entryType) {
    case "clock":
      return "You already have an open shift clock entry.";
    case "break":
      return "You are already on break.";
    case "job_labor":
      return "You already have open job work. Complete or stop it before starting another job.";
    default:
      return "You already have an active time entry.";
  }
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

    if (error.code === "23505") {
      return {
        entry: null,
        error: mapActiveEntryConstraintError(input.entry_type),
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

export function resolvePrimaryOpenTimeEntry(
  entries: TechnicianOpenTimeEntries,
): TimeEntry | null {
  return entries.breakEntry ?? entries.jobLabor ?? entries.clock ?? null;
}
