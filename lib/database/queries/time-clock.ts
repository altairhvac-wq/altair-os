import {
  closeTimeEntry,
  createTimeEntry,
  getOpenBreakEntryForTechnician,
  getOpenClockEntryForTechnician,
  getOpenJobLaborEntryForTechnician,
  getTechnicianOpenTimeEntries,
  getTimeEntryById,
  listOpenClockEntriesForCompany,
  listTimeEntries,
} from "@/lib/database/queries/time-entries";
import { recordTimeActivity } from "@/lib/database/queries/time-activities";
import {
  recordTechnicianClockedInActivity,
  recordTechnicianClockedOutActivity,
} from "@/lib/database/services/time-activity";
import { calculateDurationMinutes } from "@/shared/types/time-entry";
import type { TimeEntry } from "@/shared/types/time-entry";
import type { TimeClockEntry } from "@/shared/types/time-clock";

function mapClockTimeEntryToTimeClockEntry(entry: TimeEntry): TimeClockEntry {
  return {
    id: entry.id,
    companyId: entry.companyId,
    userId: entry.technicianId,
    userName: entry.technicianName,
    clockInAt: entry.startedAt,
    clockOutAt: entry.endedAt,
    status: entry.endedAt ? "closed" : "open",
    notes: entry.notes,
    createdAt: entry.createdAt,
    updatedAt: entry.updatedAt,
  };
}

export async function getOpenTimeClockEntryForUser(
  companyId: string,
  userId: string,
): Promise<{ entry: TimeClockEntry | null; error: string | null }> {
  const { entry: clockEntry, error } = await getOpenClockEntryForTechnician(
    companyId,
    userId,
  );

  if (error) {
    return { entry: null, error };
  }

  if (!clockEntry) {
    return { entry: null, error: null };
  }

  return {
    entry: mapClockTimeEntryToTimeClockEntry(clockEntry),
    error: null,
  };
}

export async function listTimeClockEntries(
  companyId: string,
  options: { userId?: string; limit?: number } = {},
): Promise<TimeClockEntry[]> {
  const entries = await listTimeEntries(companyId, {
    technicianId: options.userId,
    entryType: "clock",
    limit: options.limit ?? 100,
  });

  return entries.map(mapClockTimeEntryToTimeClockEntry);
}

export async function listOpenTimeClockEntries(
  companyId: string,
): Promise<TimeClockEntry[]> {
  const entries = await listOpenClockEntriesForCompany(companyId);
  return entries.map(mapClockTimeEntryToTimeClockEntry);
}

export async function clockInTimeClockEntry(
  companyId: string,
  userId: string,
  notes?: string,
): Promise<{ entry: TimeClockEntry | null; error: string | null }> {
  const { entry: existingClock } = await getOpenClockEntryForTechnician(
    companyId,
    userId,
  );

  if (existingClock) {
    return { entry: null, error: "You already have an open shift." };
  }

  const { entry, error } = await createTimeEntry({
    company_id: companyId,
    technician_id: userId,
    entry_type: "clock",
    notes: notes?.trim() || null,
  });

  if (error || !entry) {
    return { entry: null, error: error ?? "Failed to clock in." };
  }

  await recordTechnicianClockedInActivity({
    companyId,
    actorId: userId,
    entry,
  });

  return {
    entry: mapClockTimeEntryToTimeClockEntry(entry),
    error: null,
  };
}

export async function clockOutTimeClockEntry(
  companyId: string,
  userId: string,
): Promise<{ entry: TimeClockEntry | null; error: string | null }> {
  const { entry: jobLabor } = await getOpenJobLaborEntryForTechnician(
    companyId,
    userId,
  );

  if (jobLabor) {
    return {
      entry: null,
      error: "Complete or stop job work before clocking out.",
    };
  }

  const { entry: breakEntry } = await getOpenBreakEntryForTechnician(
    companyId,
    userId,
  );

  if (breakEntry) {
    return { entry: null, error: "End your break before clocking out." };
  }

  const { entry: clockEntry, error: openError } =
    await getOpenClockEntryForTechnician(companyId, userId);

  if (openError) {
    return { entry: null, error: openError };
  }

  if (!clockEntry) {
    return { entry: null, error: "You are not clocked in." };
  }

  const endedAt = new Date().toISOString();
  const durationMinutes = calculateDurationMinutes(
    clockEntry.startedAt,
    endedAt,
  );

  const { entry, error } = await closeTimeEntry(
    companyId,
    clockEntry.id,
    endedAt,
    durationMinutes,
  );

  if (error || !entry) {
    return { entry: null, error: error ?? "Failed to clock out." };
  }

  await recordTechnicianClockedOutActivity({
    companyId,
    actorId: userId,
    entry,
  });

  return {
    entry: mapClockTimeEntryToTimeClockEntry(entry),
    error: null,
  };
}

export async function correctOpenShiftTimeClockEntry(input: {
  companyId: string;
  entryId: string;
  actorId: string;
  endedAt: string;
  reason: string;
}): Promise<{ entry: TimeClockEntry | null; error: string | null }> {
  const reason = input.reason.trim();
  if (reason.length < 5) {
    return { entry: null, error: "Enter a correction reason of at least 5 characters." };
  }

  const shift = await getTimeEntryById(input.companyId, input.entryId);
  if (!shift || shift.entryType !== "clock" || shift.endedAt) {
    return { entry: null, error: "Open shift not found." };
  }

  const endedMs = Date.parse(input.endedAt);
  const startedMs = Date.parse(shift.startedAt);
  if (!Number.isFinite(endedMs) || endedMs < startedMs || endedMs > Date.now()) {
    return { entry: null, error: "Correction time must be after clock-in and not in the future." };
  }

  const { entries, error: openError } = await getTechnicianOpenTimeEntries(
    input.companyId,
    shift.technicianId,
  );
  if (openError) return { entry: null, error: openError };

  const segments = [entries.jobLabor, entries.breakEntry, entries.clock].filter(
    (entry): entry is TimeEntry => Boolean(entry),
  );

  for (const segment of segments) {
    if (Date.parse(segment.startedAt) > endedMs) {
      return {
        entry: null,
        error: `Correction time is earlier than the active ${segment.entryType.replace("_", " ")} start.`,
      };
    }
  }

  let correctedShift: TimeEntry | null = null;
  for (const segment of segments) {
    const durationMinutes = calculateDurationMinutes(segment.startedAt, input.endedAt);
    const { entry, error } = await closeTimeEntry(
      input.companyId,
      segment.id,
      input.endedAt,
      durationMinutes,
      segment.notes,
    );
    if (error || !entry) return { entry: null, error: error ?? "Failed to correct shift." };

    await recordTimeActivity({
      company_id: input.companyId,
      time_entry_id: entry.id,
      technician_id: entry.technicianId,
      job_id: entry.jobId ?? null,
      actor_id: input.actorId,
      event_type:
        entry.entryType === "clock"
          ? "technician_clocked_out"
          : entry.entryType === "break"
            ? "break_ended"
            : "job_labor_ended",
      metadata: {
        action_id: "missed_clock_out_correction",
        correction_reason: reason,
        original_started_at: segment.startedAt,
        original_ended_at: segment.endedAt,
        corrected_ended_at: input.endedAt,
        corrected_duration_minutes: durationMinutes,
      },
    });

    if (entry.entryType === "clock") correctedShift = entry;
  }

  return correctedShift
    ? { entry: mapClockTimeEntryToTimeClockEntry(correctedShift), error: null }
    : { entry: null, error: "Open shift not found." };
}
