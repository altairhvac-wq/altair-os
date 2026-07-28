import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { mapDatabaseError } from "@/lib/database/errors";
import { getDayBoundsInTimeZone } from "@/shared/lib/datetime";
import type {
  TimeEntryInsert,
  TimeEntryRow,
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

export async function listTodayTimeEntriesForCompany(
  companyId: string,
  timeZone?: string,
): Promise<TimeEntry[]> {
  const supabase = await createClient();
  const startOfToday = getStartOfTodayIso(timeZone);

  const { data, error } = await supabase
    .from("time_entries")
    .select(TIME_ENTRY_SELECT)
    .eq("company_id", companyId)
    .gte("started_at", startOfToday)
    .order("started_at", { ascending: false });

  if (error) {
    console.error("[listTodayTimeEntriesForCompany] query failed:", {
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

/** Request-scoped dedupe for company-wide job-labor lists (reports, dashboard). */
export const listCompanyJobLaborEntries = cache(
  async function listCompanyJobLaborEntries(
    companyId: string,
  ): Promise<TimeEntry[]> {
    return listTimeEntries(companyId, { entryType: "job_labor" });
  },
);

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

export async function listOpenClockEntriesForCompany(
  companyId: string,
): Promise<TimeEntry[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("time_entries")
    .select(TIME_ENTRY_SELECT)
    .eq("company_id", companyId)
    .eq("entry_type", "clock")
    .is("ended_at", null)
    .order("started_at", { ascending: true });

  if (error) {
    console.error("[listOpenClockEntriesForCompany] query failed:", {
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

  // Open-entry path is enforced by create_time_entry (migration 122).
  // Server forces technician_id = auth.uid(), started_at = now(), and null
  // ended_at / duration_minutes. Caller-supplied identity/schedule/duration
  // fields are intentionally ignored.
  const { data: created, error: rpcError } = await supabase.rpc(
    "create_time_entry",
    {
      p_company_id: input.company_id,
      p_entry_type: input.entry_type,
      p_job_id: input.job_id ?? null,
      p_notes: input.notes ?? null,
    },
  );

  if (rpcError) {
    console.error("[createTimeEntry] rpc failed:", {
      companyId: input.company_id,
      technicianId: input.technician_id,
      entryType: input.entry_type,
      code: rpcError.code,
      message: rpcError.message,
    });

    if (rpcError.code === "23505") {
      return {
        entry: null,
        error: mapActiveEntryConstraintError(input.entry_type),
      };
    }

    const msg = rpcError.message ?? "";
    if (msg.includes("You already have an open shift clock entry")) {
      return { entry: null, error: mapActiveEntryConstraintError("clock") };
    }
    if (msg.includes("You are already on break")) {
      return { entry: null, error: mapActiveEntryConstraintError("break") };
    }
    if (msg.includes("You already have open job work")) {
      return {
        entry: null,
        error: mapActiveEntryConstraintError("job_labor"),
      };
    }

    return { entry: null, error: mapDatabaseError(rpcError) };
  }

  const createdId =
    created && typeof created === "object" && "id" in created
      ? String((created as { id: string }).id)
      : null;

  if (!createdId) {
    return { entry: null, error: "Failed to create time entry." };
  }

  const { data, error } = await supabase
    .from("time_entries")
    .select(TIME_ENTRY_SELECT)
    .eq("company_id", input.company_id)
    .eq("id", createdId)
    .maybeSingle();

  if (error) {
    console.error("[createTimeEntry] post-rpc fetch failed:", {
      companyId: input.company_id,
      entryId: createdId,
      code: error.code,
      message: error.message,
    });
    return { entry: null, error: mapDatabaseError(error) };
  }

  if (!data) {
    return {
      entry: null,
      error:
        "Time entry was created but could not be read back. Refresh the page.",
    };
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
  _durationMinutes: number,
  notes?: string,
): Promise<{ entry: TimeEntry | null; error: string | null }> {
  const supabase = await createClient();

  // Close path is enforced by close_time_entry (migrations 119 / 123).
  // Duration is computed server-side. Future ends are rejected at the DB with
  // zero tolerance (p_ended_at <= now()). Caller-supplied minutes are retained
  // for API compatibility with existing clock-out / correction callers.
  const { error: rpcError } = await supabase.rpc("close_time_entry", {
    p_company_id: companyId,
    p_entry_id: entryId,
    p_ended_at: endedAt,
    p_notes: notes ?? null,
    p_update_notes: notes !== undefined,
  });

  if (rpcError) {
    console.error("[closeTimeEntry] rpc failed:", {
      companyId,
      entryId,
      code: rpcError.code,
      message: rpcError.message,
    });

    const msg = rpcError.message ?? "";
    if (msg.includes("Active time entry not found")) {
      return { entry: null, error: "Active time entry not found." };
    }
    if (msg.includes("ended_at cannot be in the future")) {
      return {
        entry: null,
        error: "End time cannot be in the future.",
      };
    }
    if (msg.includes("ended_at must be at or after started_at")) {
      return {
        entry: null,
        error: "End time must be at or after the start time.",
      };
    }

    return { entry: null, error: mapDatabaseError(rpcError) };
  }

  const { data, error } = await supabase
    .from("time_entries")
    .select(TIME_ENTRY_SELECT)
    .eq("company_id", companyId)
    .eq("id", entryId)
    .maybeSingle();

  if (error) {
    console.error("[closeTimeEntry] post-rpc fetch failed:", {
      companyId,
      entryId,
      code: error.code,
      message: error.message,
    });
    return { entry: null, error: mapDatabaseError(error) };
  }

  if (!data) {
    return {
      entry: null,
      error:
        "Time entry was closed but could not be read back. Refresh the page.",
    };
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
