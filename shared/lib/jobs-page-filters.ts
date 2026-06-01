import type { JobPriority, JobStatus } from "@/shared/types/job";
import type { DispatchSummaryHighlightLabel } from "@/shared/lib/dispatch-page-focus";

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
  const statusFilter = parseJobStatusParam(params.status);
  const unassignedOnly = parseUnassignedParam(params.unassigned);
  const priorityFilter = parseJobPriorityParam(params.priority);
  const hasAllTabFilters =
    statusFilter !== "all" || unassignedOnly || priorityFilter !== "all";

  return {
    viewTab:
      params.view === "all" || hasAllTabFilters
        ? "all"
        : parseJobsViewParam(params.view),
    statusFilter,
    priorityFilter,
    unassignedOnly,
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

  if (viewTab === "all") {
    params.set("view", "all");
  }

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
  "In Progress": { viewTab: "all", statusFilter: "in_progress" },
  Unassigned: { viewTab: "all", unassignedOnly: true },
  Completed: { viewTab: "all", statusFilter: "completed" },
};

export function getDispatchSummaryCardHref(
  label: DispatchSummaryHighlightLabel,
): string {
  return buildJobsPageHref(DISPATCH_SUMMARY_CARD_FILTER_MAP[label]);
}
