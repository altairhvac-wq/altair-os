import {
  closeTimeEntry,
  createTimeEntry,
  getActiveTimeEntryForTechnician,
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
  const { entry: activeEntry, error } = await getActiveTimeEntryForTechnician(
    companyId,
    userId,
  );

  if (error) {
    return { entry: null, error };
  }

  if (!activeEntry || activeEntry.entryType !== "clock") {
    return { entry: null, error: null };
  }

  return {
    entry: mapClockTimeEntryToTimeClockEntry(activeEntry),
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
  const { entry: activeEntry } = await getActiveTimeEntryForTechnician(
    companyId,
    userId,
  );

  if (activeEntry) {
    if (activeEntry.entryType === "clock") {
      return { entry: null, error: "You already have an open shift." };
    }

    return {
      entry: null,
      error: "End your break or job work before clocking in again.",
    };
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
  const { entry: activeEntry, error: openError } =
    await getActiveTimeEntryForTechnician(companyId, userId);

  if (openError) {
    return { entry: null, error: openError };
  }

  if (!activeEntry) {
    return { entry: null, error: "You are not clocked in." };
  }

  if (activeEntry.entryType !== "clock") {
    return {
      entry: null,
      error: "End your break or job work before clocking out.",
    };
  }

  const endedAt = new Date().toISOString();
  const durationMinutes = calculateDurationMinutes(
    activeEntry.startedAt,
    endedAt,
  );

  const { entry, error } = await closeTimeEntry(
    companyId,
    activeEntry.id,
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
