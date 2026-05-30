import {
  closeTimeEntry,
  createTimeEntry,
  getOpenBreakEntryForTechnician,
  getOpenClockEntryForTechnician,
  getOpenJobLaborEntryForTechnician,
  getTechnicianOpenTimeEntries,
  getTodayTimeEntriesForTechnician,
  listOpenJobLaborEntriesForJob,
  resolvePrimaryOpenTimeEntry,
} from "@/lib/database/queries/time-entries";
import { getJobById } from "@/lib/database/queries/jobs";
import { listAssignedJobsForTechnician } from "@/lib/database/queries/technician-jobs";
import { isActiveTechnicianJob } from "@/shared/lib/technician-work-queue";
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
import { recordJobLaborAutoClosedActivity } from "@/lib/database/services/job-activity";
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

function buildStateSnapshot(
  openEntries: Awaited<
    ReturnType<typeof getTechnicianOpenTimeEntries>
  >["entries"],
): TechnicianTimeStateSnapshot {
  const primary = resolvePrimaryOpenTimeEntry(openEntries);

  if (!primary) {
    return { state: "off_clock" };
  }

  const jobLabor = openEntries.jobLabor;

  return {
    state:
      openEntries.breakEntry != null
        ? "on_break"
        : jobLabor != null
          ? "working_job"
          : "clocked_in",
    activeEntry: primary,
    openClockEntry: openEntries.clock ?? undefined,
    openJobLaborEntry: jobLabor ?? undefined,
    openBreakEntry: openEntries.breakEntry ?? undefined,
    activeJobId: jobLabor?.jobId,
    activeJobNumber: jobLabor?.jobNumber,
  };
}

async function loadTechnicianState(
  companyId: string,
  technicianId: string,
): Promise<TechnicianTimeStateSnapshot> {
  const { entries, error } = await getTechnicianOpenTimeEntries(
    companyId,
    technicianId,
  );

  if (error) {
    console.error("[loadTechnicianState] query failed:", {
      companyId,
      technicianId,
      error,
    });
    return { state: "off_clock" };
  }

  return buildStateSnapshot(entries);
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

async function ensureOpenClockEntry(input: {
  companyId: string;
  technicianId: string;
  actorId: string;
  recordActivity?: boolean;
}): Promise<{ entry: TimeEntry | null; error: string | null }> {
  const { entry: existing } = await getOpenClockEntryForTechnician(
    input.companyId,
    input.technicianId,
  );

  if (existing) {
    return { entry: existing, error: null };
  }

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
  return loadTechnicianState(companyId, technicianId);
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
  const { entry: existingClock } = await getOpenClockEntryForTechnician(
    input.companyId,
    input.technicianId,
  );

  if (existingClock) {
    return { error: "You already have an active shift clock entry." };
  }

  const { entry, error } = await ensureOpenClockEntry({
    ...input,
    recordActivity: true,
  });

  if (error || !entry) {
    return { error: error ?? "Failed to clock in." };
  }

  const state = await loadTechnicianState(
    input.companyId,
    input.technicianId,
  );

  return { entry, state };
}

export async function stopClock(input: {
  companyId: string;
  technicianId: string;
  actorId: string;
}): Promise<TimeTrackingResult> {
  const { entries } = await getTechnicianOpenTimeEntries(
    input.companyId,
    input.technicianId,
  );

  if (entries.jobLabor) {
    return {
      error: "Complete or stop job work before clocking out for the day.",
    };
  }

  if (entries.breakEntry) {
    return { error: "End your break before clocking out." };
  }

  const clockEntry = entries.clock;

  if (!clockEntry) {
    return { error: "You are not clocked in." };
  }

  const { entry, error } = await closeActiveEntry({
    companyId: input.companyId,
    actorId: input.actorId,
    activeEntry: clockEntry,
    activity: "technician_clocked_out",
  });

  if (error || !entry) {
    return { error: error ?? "Failed to clock out." };
  }

  return {
    entry,
    state: buildStateSnapshot({
      clock: null,
      jobLabor: null,
      breakEntry: null,
    }),
  };
}

export async function startBreak(input: {
  companyId: string;
  technicianId: string;
  actorId: string;
}): Promise<TimeTrackingResult> {
  const { entries } = await getTechnicianOpenTimeEntries(
    input.companyId,
    input.technicianId,
  );

  if (!entries.clock) {
    return { error: "Clock in before starting a break." };
  }

  if (entries.breakEntry) {
    return { error: "You are already on break." };
  }

  if (entries.jobLabor) {
    const { error: closeError } = await closeActiveEntry({
      companyId: input.companyId,
      actorId: input.actorId,
      activeEntry: entries.jobLabor,
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

  const state = await loadTechnicianState(
    input.companyId,
    input.technicianId,
  );

  return { entry, state };
}

export async function endBreak(input: {
  companyId: string;
  technicianId: string;
  actorId: string;
}): Promise<TimeTrackingResult> {
  const { entry: breakEntry } = await getOpenBreakEntryForTechnician(
    input.companyId,
    input.technicianId,
  );

  if (!breakEntry) {
    return { error: "You are not currently on break." };
  }

  const { error: closeError } = await closeActiveEntry({
    companyId: input.companyId,
    actorId: input.actorId,
    activeEntry: breakEntry,
    activity: "break_ended",
  });

  if (closeError) {
    return { error: closeError };
  }

  const state = await loadTechnicianState(
    input.companyId,
    input.technicianId,
  );

  return { state };
}

export async function startJobLabor(input: {
  companyId: string;
  technicianId: string;
  actorId: string;
  jobId: string;
}): Promise<TimeTrackingResult> {
  return ensureTimeTrackingForStartWork(input);
}

/**
 * Called when a technician taps Start Work: ensure payroll clock + job labor
 * without closing the shift clock.
 */
export async function ensureTimeTrackingForStartWork(input: {
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

  const { entries } = await getTechnicianOpenTimeEntries(
    input.companyId,
    input.technicianId,
  );

  if (entries.breakEntry) {
    return { error: "End your break before starting job work." };
  }

  if (entries.jobLabor) {
    if (entries.jobLabor.jobId === input.jobId) {
      const state = await loadTechnicianState(
        input.companyId,
        input.technicianId,
      );
      return { state, entry: entries.jobLabor };
    }

    const otherJob = entries.jobLabor.jobNumber ?? "another job";
    return {
      error: `You are still working ${otherJob}. Complete that job or stop job work before starting this one.`,
    };
  }

  const { error: clockError } = await ensureOpenClockEntry({
    companyId: input.companyId,
    technicianId: input.technicianId,
    actorId: input.actorId,
    recordActivity: true,
  });

  if (clockError) {
    return { error: clockError };
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

  const state = await loadTechnicianState(
    input.companyId,
    input.technicianId,
  );

  return { entry, state };
}

export async function stopJobLabor(input: {
  companyId: string;
  technicianId: string;
  actorId: string;
  jobId?: string;
}): Promise<TimeTrackingResult> {
  const { entry: jobLabor } = await getOpenJobLaborEntryForTechnician(
    input.companyId,
    input.technicianId,
  );

  if (!jobLabor) {
    return { error: "You are not currently working a job." };
  }

  if (input.jobId && jobLabor.jobId !== input.jobId) {
    return { error: "You are working a different job." };
  }

  const { error: closeError } = await closeActiveEntry({
    companyId: input.companyId,
    actorId: input.actorId,
    activeEntry: jobLabor,
    activity: "job_labor_ended",
  });

  if (closeError) {
    return { error: closeError };
  }

  const state = await loadTechnicianState(
    input.companyId,
    input.technicianId,
  );

  return { state };
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
  }

  const job = await getJobById(input.companyId, input.jobId);

  await recordJobLaborAutoClosedActivity({
    companyId: input.companyId,
    jobId: input.jobId,
    actorId: input.actorId,
    closedReason: input.terminalReason,
    entriesClosedCount: openEntries.length,
    customerId: job?.customerId,
    jobNumber: job?.jobNumber,
  });

  return { closedCount: openEntries.length, error: null };
}

/**
 * After completing a job, prompt shift clock-out only when the technician has
 * no other active assignments and their payroll clock is still open.
 */
export async function shouldPromptShiftClockOutAfterJobComplete(input: {
  companyId: string;
  technicianId: string;
  completedJobId: string;
  timeZone?: string;
}): Promise<boolean> {
  const state = await getCurrentTimeState(input.companyId, input.technicianId);

  if (!state.openClockEntry) {
    return false;
  }

  const jobs = await listAssignedJobsForTechnician(
    input.companyId,
    input.technicianId,
    { timeZone: input.timeZone },
  );

  const remainingActiveJobs = jobs.filter(
    (job) =>
      job.id !== input.completedJobId && isActiveTechnicianJob(job),
  );

  return remainingActiveJobs.length === 0;
}
