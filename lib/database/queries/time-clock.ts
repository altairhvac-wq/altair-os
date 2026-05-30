import {
  closeTimeEntry,
  createTimeEntry,
  getOpenBreakEntryForTechnician,
  getOpenClockEntryForTechnician,
  getOpenJobLaborEntryForTechnician,
  listTimeEntries,
} from "@/lib/database/queries/time-entries";
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
