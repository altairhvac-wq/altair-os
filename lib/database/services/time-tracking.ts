import {
  closeTimeEntry,
  createTimeEntry,
  getActiveTimeEntryForTechnician,
  getTodayTimeEntriesForTechnician,
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
): Promise<{ entries: TimeEntry[]; summary: TodayTimeSummary }> {
  const { entries } = await getTodayTimeEntriesForTechnician(
    companyId,
    technicianId,
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
