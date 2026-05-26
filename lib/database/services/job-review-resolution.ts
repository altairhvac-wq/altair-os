import {
  countJobReviewBlockerResolutionsSince,
  recordJobActivity,
} from "@/lib/database/queries/job-activities";
import { getJobProfitabilitySnapshot } from "@/lib/database/services/job-profitability";
import type { JobStatus } from "@/shared/types/job";
import type { JobProfitabilitySnapshot } from "@/shared/types/job-profitability";
import {
  detectJobReviewBlockerResolutions,
  isCompletedJobReviewResolutionCandidate,
  type JobReviewBlockerResolutionEventType,
} from "@/shared/types/job-review-resolution";
import {
  buildQueueResolutionTrendSummary,
  type QueueResolutionTrendSummary,
} from "@/shared/types/queue-resolution-trends";

function startOfLocalWeek(reference = new Date()): Date {
  const start = new Date(reference);
  start.setHours(0, 0, 0, 0);
  const day = start.getDay();
  const daysFromMonday = (day + 6) % 7;
  start.setDate(start.getDate() - daysFromMonday);
  return start;
}

function startOfPreviousLocalWeek(reference = new Date()): Date {
  const start = startOfLocalWeek(reference);
  start.setDate(start.getDate() - 7);
  return start;
}

function startOfLocalDaysAgo(days: number, reference = new Date()): Date {
  const start = new Date(reference);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - days);
  return start;
}

export async function getJobReviewBlockerResolutionsThisWeekCount(
  companyId: string,
): Promise<number> {
  return countJobReviewBlockerResolutionsSince(
    companyId,
    startOfLocalWeek().toISOString(),
  );
}

/**
 * Read-only resolution velocity trend from existing blocker-resolution events.
 * Uses three company-scoped count queries — no mutation or cron side effects.
 */
export async function getJobReviewBlockerResolutionTrendSummary(
  companyId: string,
  reference = new Date(),
): Promise<QueueResolutionTrendSummary> {
  const thisWeekStart = startOfLocalWeek(reference);
  const lastWeekStart = startOfPreviousLocalWeek(reference);
  const sevenDaysAgo = startOfLocalDaysAgo(7, reference);

  const [countSinceThisWeek, countSinceLastWeek, countSinceSevenDaysAgo] =
    await Promise.all([
      countJobReviewBlockerResolutionsSince(
        companyId,
        thisWeekStart.toISOString(),
      ),
      countJobReviewBlockerResolutionsSince(
        companyId,
        lastWeekStart.toISOString(),
      ),
      countJobReviewBlockerResolutionsSince(
        companyId,
        sevenDaysAgo.toISOString(),
      ),
    ]);

  return buildQueueResolutionTrendSummary({
    resolvedThisWeek: countSinceThisWeek,
    resolvedLastWeek: countSinceLastWeek - countSinceThisWeek,
    resolvedLastSevenDays: countSinceSevenDaysAgo,
  });
}

async function recordJobReviewBlockerResolvedActivity(input: {
  companyId: string;
  jobId: string;
  actorId: string;
  eventType: JobReviewBlockerResolutionEventType;
  jobNumber?: string;
  customerId?: string;
}): Promise<void> {
  const { error } = await recordJobActivity({
    company_id: input.companyId,
    job_id: input.jobId,
    actor_id: input.actorId,
    event_type: input.eventType,
    metadata: {
      customer_id: input.customerId,
      job_id: input.jobId,
      job_number: input.jobNumber,
      review_blocker: input.eventType,
    },
  });

  if (error) {
    console.error("[recordJobReviewBlockerResolvedActivity] failed:", {
      jobId: input.jobId,
      eventType: input.eventType,
      error,
    });
  }
}

/**
 * Compares profitability completeness before and after a mutation on a
 * completed job. Emits one activity per blocker that transitions unresolved → resolved.
 *
 * TODO: Office review queues — route unresolved blockers to assignable worklists.
 * TODO: SLA tracking — measure time from job completion to blocker resolution.
 * TODO: AI workflow auditing — summarize resolution patterns and missed follow-ups.
 * TODO: Automated cleanup reminders — nudge owners when blockers remain open.
 */
export async function trackJobReviewBlockerResolutions(input: {
  companyId: string;
  jobId: string;
  jobStatus: JobStatus;
  actorId: string;
  beforeSnapshot: JobProfitabilitySnapshot;
  jobNumber?: string;
  customerId?: string;
  afterSnapshot?: JobProfitabilitySnapshot;
}): Promise<void> {
  if (!isCompletedJobReviewResolutionCandidate(input.jobStatus)) {
    return;
  }

  const afterSnapshot =
    input.afterSnapshot ??
    (await getJobProfitabilitySnapshot(input.companyId, input.jobId));

  const resolutions = detectJobReviewBlockerResolutions(
    input.beforeSnapshot.completeness,
    afterSnapshot.completeness,
  );

  if (resolutions.length === 0) {
    return;
  }

  await Promise.all(
    resolutions.map((eventType) =>
      recordJobReviewBlockerResolvedActivity({
        companyId: input.companyId,
        jobId: input.jobId,
        actorId: input.actorId,
        eventType,
        jobNumber: input.jobNumber,
        customerId: input.customerId,
      }),
    ),
  );
}

export async function captureCompletedJobReviewSnapshot(
  companyId: string,
  jobId: string,
  jobStatus: JobStatus,
): Promise<JobProfitabilitySnapshot | null> {
  if (!isCompletedJobReviewResolutionCandidate(jobStatus)) {
    return null;
  }

  return getJobProfitabilitySnapshot(companyId, jobId);
}
