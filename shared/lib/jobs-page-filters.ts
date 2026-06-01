import type { JobPriority, JobStatus } from "@/shared/types/job";
import type { DispatchSummaryHighlightLabel } from "@/shared/lib/dispatch-page-focus";
import type { Job } from "@/shared/types/job";

export type JobsViewTab = "today" | "all";

export type JobsPageFilters = {
  viewTab: JobsViewTab;
  statusFilter: JobStatus | "all";
  priorityFilter: JobPriority | "all";
  unassignedOnly: boolean;
};

const VALID_JOB_STATUSES = new Set<string>([
  "scheduled",
  "dispatched",
  "arrived",
  "in_progress",
  "completed",
  "cancelled",
]);

const VALID_JOB_PRIORITIES = new Set<string>([
  "low",
  "normal",
  "high",
  "urgent",
]);

export function parseJobStatusParam(
  status: string | undefined | null,
): JobStatus | "all" {
  if (!status || !VALID_JOB_STATUSES.has(status)) {
    return "all";
  }

  return status as JobStatus;
}

export function parseJobPriorityParam(
  priority: string | undefined | null,
): JobPriority | "all" {
  if (!priority || !VALID_JOB_PRIORITIES.has(priority)) {
    return "all";
  }

  return priority as JobPriority;
}

export function parseJobsViewParam(view: string | undefined | null): JobsViewTab {
  if (view === "all") {
    return "all";
  }

  return "today";
}

export function parseUnassignedParam(
  unassigned: string | undefined | null,
): boolean {
  return unassigned === "1" || unassigned === "true";
}

export function parseJobsPageSearchParams(params: {
  status?: string;
  view?: string;
  unassigned?: string;
  priority?: string;
}): JobsPageFilters {
  return {
    viewTab: parseJobsViewParam(params.view),
    statusFilter: parseJobStatusParam(params.status),
    priorityFilter: parseJobPriorityParam(params.priority),
    unassignedOnly: parseUnassignedParam(params.unassigned),
  };
}

export function buildJobsPageHref(
  filters: Partial<JobsPageFilters>,
  existingParams?: URLSearchParams,
): string {
  const params = existingParams
    ? new URLSearchParams(existingParams.toString())
    : new URLSearchParams();

  params.delete("view");
  params.delete("status");
  params.delete("unassigned");
  params.delete("priority");

  const viewTab = filters.viewTab ?? "today";
  const statusFilter = filters.statusFilter ?? "all";
  const priorityFilter = filters.priorityFilter ?? "all";
  const unassignedOnly = filters.unassignedOnly ?? false;

  params.set("view", viewTab === "all" ? "all" : "today");

  if (statusFilter !== "all") {
    params.set("status", statusFilter);
  }

  if (priorityFilter !== "all") {
    params.set("priority", priorityFilter);
  }

  if (unassignedOnly) {
    params.set("unassigned", "1");
  }

  const query = params.toString();
  return query ? `/jobs?${query}` : "/jobs";
}

const DISPATCH_SUMMARY_CARD_FILTER_MAP: Record<
  DispatchSummaryHighlightLabel,
  Partial<JobsPageFilters>
> = {
  "Scheduled Today": { viewTab: "today" },
  "In Progress": { viewTab: "today", statusFilter: "in_progress" },
  Unassigned: { viewTab: "today", unassignedOnly: true },
  Completed: { viewTab: "today", statusFilter: "completed" },
};

export function getDispatchSummaryCardHref(
  label: DispatchSummaryHighlightLabel,
): string {
  return buildJobsPageHref(DISPATCH_SUMMARY_CARD_FILTER_MAP[label]);
}

/** Matches dispatch "In Progress" card: on site or actively working. */
const IN_PROGRESS_DISPATCH_STATUSES = new Set<JobStatus>([
  "arrived",
  "in_progress",
]);

export function filterJobsByPageFilters(
  jobs: Job[],
  statusFilter: JobStatus | "all",
  priorityFilter: JobPriority | "all",
  unassignedOnly: boolean,
  options?: { matchDispatchInProgressCard?: boolean },
): Job[] {
  return jobs.filter((job) => {
    const matchesStatus =
      statusFilter === "all"
        ? true
        : statusFilter === "in_progress" &&
            options?.matchDispatchInProgressCard
          ? IN_PROGRESS_DISPATCH_STATUSES.has(job.status)
          : job.status === statusFilter;
    const matchesPriority =
      priorityFilter === "all" || job.priority === priorityFilter;
    const matchesUnassigned =
      !unassignedOnly || !job.assignedTechnicianId;

    return matchesStatus && matchesPriority && matchesUnassigned;
  });
}

export function hasActiveJobsPageFilters(filters: JobsPageFilters): boolean {
  return (
    filters.statusFilter !== "all" ||
    filters.priorityFilter !== "all" ||
    filters.unassignedOnly
  );
}
