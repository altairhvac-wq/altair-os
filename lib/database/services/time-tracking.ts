import {
  closeTimeEntry,
  createTimeEntry,
  getActiveTimeEntryForTechnician,
  getTodayTimeEntriesForTechnician,
  listOpenJobLaborEntriesForJob,
  mapEntryTypeToTimeState,
} from "@/lib/database/queries/time-entries";
import { getJobById } from "@/lib/database/queries/jobs";
import {
  captureCompletedJobReviewSnapshot,
  trackJobReviewBlockerResolutions,
} from "@/lib/database/services/job-review-resolution";
import {
  recordBreakEndedActivity,
  recordBreakStartedActivity,
  recordJobLaborEndedActivity,
  recordJobLaborStartedActivity,
  recordTechnicianClockedInActivity,
  recordTechnicianClockedOutActivity,
} from "@/lib/database/services/time-activity";
import {
  calculateDurationMinutes,
  type TechnicianTimeStateSnapshot,
  type TimeEntry,
  type TodayTimeSummary,
  summarizeTodayEntries,
} from "@/shared/types/time-entry";

type TimeTrackingResult = {
  error?: string;
  state?: TechnicianTimeStateSnapshot;
  entry?: TimeEntry;
  entries?: TimeEntry[];
  summary?: TodayTimeSummary;
};

function buildStateSnapshot(activeEntry: TimeEntry | null): TechnicianTimeStateSnapshot {
  if (!activeEntry) {
    return { state: "off_clock" };
  }

  return {
    state: mapEntryTypeToTimeState(activeEntry.entryType),
    activeEntry,
    activeJobId: activeEntry.jobId,
    activeJobNumber: activeEntry.jobNumber,
  };
}

async function closeActiveEntry(input: {
  companyId: string;
  actorId: string;
  activeEntry: TimeEntry;
  activity:
    | "technician_clocked_out"
    | "break_ended"
    | "job_labor_ended"
    | null;
}): Promise<{ entry: TimeEntry | null; error: string | null }> {
  let reviewSnapshotBefore = null;
  let reviewJob:
    | Awaited<ReturnType<typeof getJobById>>
    | null = null;

  if (
    input.activeEntry.entryType === "job_labor" &&
    input.activeEntry.jobId
  ) {
    reviewJob = await getJobById(input.companyId, input.activeEntry.jobId);
    if (reviewJob) {
      reviewSnapshotBefore = await captureCompletedJobReviewSnapshot(
        input.companyId,
        reviewJob.id,
        reviewJob.status,
      );
    }
  }

  const endedAt = new Date().toISOString();
  const durationMinutes = calculateDurationMinutes(
    input.activeEntry.startedAt,
    endedAt,
  );

  const { entry, error } = await closeTimeEntry(
    input.companyId,
    input.activeEntry.id,
    endedAt,
    durationMinutes,
  );

  if (error || !entry) {
    return { entry: null, error: error ?? "Failed to close time entry." };
  }

  if (input.activity === "technician_clocked_out") {
    await recordTechnicianClockedOutActivity({
      companyId: input.companyId,
      actorId: input.actorId,
      entry,
    });
  } else if (input.activity === "break_ended") {
    await recordBreakEndedActivity({
      companyId: input.companyId,
      actorId: input.actorId,
      entry,
    });
  } else if (input.activity === "job_labor_ended") {
    await recordJobLaborEndedActivity({
      companyId: input.companyId,
      actorId: input.actorId,
      entry,
    });
  }

  if (reviewSnapshotBefore && reviewJob) {
    void trackJobReviewBlockerResolutions({
      companyId: input.companyId,
      jobId: reviewJob.id,
      jobStatus: reviewJob.status,
      actorId: input.actorId,
      beforeSnapshot: reviewSnapshotBefore,
      jobNumber: reviewJob.jobNumber,
      customerId: reviewJob.customerId,
    }).catch((trackingError) => {
      console.error("[closeActiveEntry] review resolution tracking failed:", {
        jobId: reviewJob.id,
        trackingError,
      });
    });
  }

  return { entry, error: null };
}

async function openClockEntry(input: {
  companyId: string;
  technicianId: string;
  actorId: string;
  recordActivity?: boolean;
}): Promise<{ entry: TimeEntry | null; error: string | null }> {
  const { entry, error } = await createTimeEntry({
    company_id: input.companyId,
    technician_id: input.technicianId,
    entry_type: "clock",
  });

  if (error || !entry) {
    return { entry: null, error: error ?? "Failed to start clock entry." };
  }

  if (input.recordActivity !== false) {
    await recordTechnicianClockedInActivity({
      companyId: input.companyId,
      actorId: input.actorId,
      entry,
    });
  }

  return { entry, error: null };
}

export async function getCurrentTimeState(
  companyId: string,
  technicianId: string,
): Promise<TechnicianTimeStateSnapshot> {
  const { entry } = await getActiveTimeEntryForTechnician(
    companyId,
    technicianId,
  );

  return buildStateSnapshot(entry);
}

export async function getTodayTimeEntries(
  companyId: string,
  technicianId: string,
  timeZone?: string,
): Promise<{ entries: TimeEntry[]; summary: TodayTimeSummary }> {
  const { entries } = await getTodayTimeEntriesForTechnician(
    companyId,
    technicianId,
    timeZone,
  );

  return {
    entries,
    summary: summarizeTodayEntries(entries),
  };
}

export async function startClock(input: {
  companyId: string;
  technicianId: string;
  actorId: string;
}): Promise<TimeTrackingResult> {
  const { entry: activeEntry } = await getActiveTimeEntryForTechnician(
    input.companyId,
    input.technicianId,
  );

  if (activeEntry) {
    return { error: "You already have an active time entry." };
  }

  const { entry, error } = await openClockEntry(input);
  if (error || !entry) {
    return { error: error ?? "Failed to clock in." };
  }

  return {
    entry,
    state: buildStateSnapshot(entry),
  };
}

export async function stopClock(input: {
  companyId: string;
  technicianId: string;
  actorId: string;
}): Promise<TimeTrackingResult> {
  const { entry: activeEntry } = await getActiveTimeEntryForTechnician(
    input.companyId,
    input.technicianId,
  );

  if (!activeEntry) {
    return { error: "You are not clocked in." };
  }

  if (activeEntry.entryType !== "clock") {
    return {
      error: "End your break or job work before clocking out.",
    };
  }

  const { entry, error } = await closeActiveEntry({
    companyId: input.companyId,
    actorId: input.actorId,
    activeEntry,
    activity: "technician_clocked_out",
  });

  if (error || !entry) {
    return { error: error ?? "Failed to clock out." };
  }

  return {
    entry,
    state: buildStateSnapshot(null),
  };
}

export async function startBreak(input: {
  companyId: string;
  technicianId: string;
  actorId: string;
}): Promise<TimeTrackingResult> {
  const { entry: activeEntry } = await getActiveTimeEntryForTechnician(
    input.companyId,
    input.technicianId,
  );

  if (!activeEntry) {
    return { error: "Clock in before starting a break." };
  }

  if (activeEntry.entryType === "break") {
    return { error: "You are already on break." };
  }

  if (activeEntry.entryType === "clock") {
    const { error: closeError } = await closeActiveEntry({
      companyId: input.companyId,
      actorId: input.actorId,
      activeEntry,
      activity: null,
    });

    if (closeError) {
      return { error: closeError };
    }
  } else if (activeEntry.entryType === "job_labor") {
    const { error: closeError } = await closeActiveEntry({
      companyId: input.companyId,
      actorId: input.actorId,
      activeEntry,
      activity: "job_labor_ended",
    });

    if (closeError) {
      return { error: closeError };
    }
  }

  const { entry, error } = await createTimeEntry({
    company_id: input.companyId,
    technician_id: input.technicianId,
    entry_type: "break",
  });

  if (error || !entry) {
    return { error: error ?? "Failed to start break." };
  }

  await recordBreakStartedActivity({
    companyId: input.companyId,
    actorId: input.actorId,
    entry,
  });

  return {
    entry,
    state: buildStateSnapshot(entry),
  };
}

export async function endBreak(input: {
  companyId: string;
  technicianId: string;
  actorId: string;
}): Promise<TimeTrackingResult> {
  const { entry: activeEntry } = await getActiveTimeEntryForTechnician(
    input.companyId,
    input.technicianId,
  );

  if (!activeEntry || activeEntry.entryType !== "break") {
    return { error: "You are not currently on break." };
  }

  const { error: closeError } = await closeActiveEntry({
    companyId: input.companyId,
    actorId: input.actorId,
    activeEntry,
    activity: "break_ended",
  });

  if (closeError) {
    return { error: closeError };
  }

  const { entry, error } = await openClockEntry({
    ...input,
    recordActivity: false,
  });

  if (error || !entry) {
    return { error: error ?? "Failed to resume after break." };
  }

  return {
    entry,
    state: buildStateSnapshot(entry),
  };
}

export async function startJobLabor(input: {
  companyId: string;
  technicianId: string;
  actorId: string;
  jobId: string;
}): Promise<TimeTrackingResult> {
  const job = await getJobById(input.companyId, input.jobId);

  if (!job) {
    return { error: "Linked job not found." };
  }

  if (job.assignedTechnicianId !== input.technicianId) {
    return { error: "You can only track labor on jobs assigned to you." };
  }

  if (job.status === "completed" || job.status === "cancelled") {
    return { error: "This job is no longer active." };
  }

  const { entry: activeEntry } = await getActiveTimeEntryForTechnician(
    input.companyId,
    input.technicianId,
  );

  if (!activeEntry) {
    return { error: "Clock in before starting job work." };
  }

  if (activeEntry.entryType === "job_labor") {
    if (activeEntry.jobId === input.jobId) {
      return { error: "You are already working this job." };
    }

    return { error: "Stop your current job work before starting another job." };
  }

  if (activeEntry.entryType === "break") {
    return { error: "End your break before starting job work." };
  }

  if (activeEntry.entryType !== "clock") {
    return { error: "You must be clocked in to start job work." };
  }

  const { error: closeError } = await closeActiveEntry({
    companyId: input.companyId,
    actorId: input.actorId,
    activeEntry,
    activity: null,
  });

  if (closeError) {
    return { error: closeError };
  }

  const { entry, error } = await createTimeEntry({
    company_id: input.companyId,
    technician_id: input.technicianId,
    job_id: input.jobId,
    entry_type: "job_labor",
  });

  if (error || !entry) {
    return { error: error ?? "Failed to start job work." };
  }

  await recordJobLaborStartedActivity({
    companyId: input.companyId,
    actorId: input.actorId,
    entry,
  });

  return {
    entry,
    state: buildStateSnapshot(entry),
  };
}

export async function stopJobLabor(input: {
  companyId: string;
  technicianId: string;
  actorId: string;
  jobId?: string;
}): Promise<TimeTrackingResult> {
  const { entry: activeEntry } = await getActiveTimeEntryForTechnician(
    input.companyId,
    input.technicianId,
  );

  if (!activeEntry || activeEntry.entryType !== "job_labor") {
    return { error: "You are not currently working a job." };
  }

  if (input.jobId && activeEntry.jobId !== input.jobId) {
    return { error: "You are working a different job." };
  }

  const { error: closeError } = await closeActiveEntry({
    companyId: input.companyId,
    actorId: input.actorId,
    activeEntry,
    activity: "job_labor_ended",
  });

  if (closeError) {
    return { error: closeError };
  }

  const { entry, error } = await openClockEntry({
    companyId: input.companyId,
    technicianId: input.technicianId,
    actorId: input.actorId,
    recordActivity: false,
  });

  if (error || !entry) {
    return { error: error ?? "Failed to resume after job work." };
  }

  return {
    entry,
    state: buildStateSnapshot(entry),
  };
}

const JOB_LABOR_AUTO_CLOSE_NOTES = {
  completed: "Auto-closed when job was marked complete.",
  cancelled: "Auto-closed when job was cancelled.",
} as const;

export async function finalizeOpenJobLaborForTerminalJob(input: {
  companyId: string;
  jobId: string;
  terminalReason: "completed" | "cancelled";
  actorId: string;
  endedAt?: string;
}): Promise<{ closedCount: number; error: string | null }> {
  const openEntries = await listOpenJobLaborEntriesForJob(
    input.companyId,
    input.jobId,
  );

  if (openEntries.length === 0) {
    return { closedCount: 0, error: null };
  }

  const endedAt = input.endedAt ?? new Date().toISOString();
  const closeNote = JOB_LABOR_AUTO_CLOSE_NOTES[input.terminalReason];

  for (const entry of openEntries) {
    const durationMinutes = calculateDurationMinutes(entry.startedAt, endedAt);
    const { entry: closedEntry, error } = await closeTimeEntry(
      input.companyId,
      entry.id,
      endedAt,
      durationMinutes,
      closeNote,
    );

    if (error || !closedEntry) {
      console.error("[finalizeOpenJobLaborForTerminalJob] close failed:", {
        companyId: input.companyId,
        jobId: input.jobId,
        entryId: entry.id,
        error,
      });
      return {
        closedCount: 0,
        error:
          error ??
          "Could not close open labor for this job. Stop job work and try again.",
      };
    }

    await recordJobLaborEndedActivity({
      companyId: input.companyId,
      actorId: input.actorId,
      entry: closedEntry,
      extraMetadata: {
        auto_closed: true,
        closed_reason: input.terminalReason,
      },
    });

    const { error: clockError } = await openClockEntry({
      companyId: input.companyId,
      technicianId: entry.technicianId,
      actorId: input.actorId,
      recordActivity: false,
    });

    if (clockError) {
      console.error(
        "[finalizeOpenJobLaborForTerminalJob] resume clock failed:",
        {
          companyId: input.companyId,
          jobId: input.jobId,
          technicianId: entry.technicianId,
          error: clockError,
        },
      );
    }
  }

  return { closedCount: openEntries.length, error: null };
}
