import type { DispatchJob, DispatchJobStatus } from "@/shared/types/dispatch";

export const DISPATCH_PAGE_UNASSIGNED_HREF = "/dispatch?focus=unassigned";
export const DISPATCH_PAGE_TODAY_HREF = "/dispatch?focus=today";
export const DISPATCH_PAGE_OVERLOAD_HREF = "/dispatch?focus=overload";

export type DispatchPageFocus = "unassigned" | "today" | "overload";

export type DispatchSummaryHighlightLabel =
  | "Scheduled Today"
  | "In Progress"
  | "Unassigned"
  | "Completed";

export type DispatchPageFocusState = {
  focus: DispatchPageFocus | null;
  banner: {
    title: string;
    description: string;
    clearHref: string;
  } | null;
  highlightedSummaryLabels: DispatchSummaryHighlightLabel[];
  initialTechnicianFilter: "all" | "unassigned";
  emphasizeWorkload: boolean;
  emphasizeBoard: boolean;
  highlightUnassignedPanel: boolean;
  boardEyebrow: string | null;
  boardDescription: string | null;
  overloadedTechnicianIds: string[];
};

const VALID_FOCUS_PARAMS = new Set<DispatchPageFocus>([
  "unassigned",
  "today",
  "overload",
]);

const ACTIVE_DISPATCH_JOB_STATUSES = new Set<DispatchJobStatus>([
  "scheduled",
  "dispatched",
  "arrived",
  "in_progress",
]);

/** Mirrors dashboard overload counting for display-only emphasis on /dispatch. */
export function getOverloadedTechnicianIds(jobs: DispatchJob[]): string[] {
  const activeJobsByTechnician = new Map<string, number>();

  for (const job of jobs) {
    if (!job.technicianId || !ACTIVE_DISPATCH_JOB_STATUSES.has(job.status)) {
      continue;
    }

    activeJobsByTechnician.set(
      job.technicianId,
      (activeJobsByTechnician.get(job.technicianId) ?? 0) + 1,
    );
  }

  return [...activeJobsByTechnician.entries()]
    .filter(([, count]) => count >= 2)
    .map(([technicianId]) => technicianId);
}

function resolveBannerCopy(
  focus: DispatchPageFocus | null,
  overloadedTechnicianIds: string[],
): Pick<DispatchPageFocusState, "banner">["banner"] {
  if (focus === "unassigned") {
    return {
      title: "Unassigned jobs need technicians",
      description:
        "Today's board is filtered to unassigned work. Assign technicians from job details or the unassigned panel below.",
      clearHref: "/dispatch",
    };
  }

  if (focus === "today") {
    return {
      title: "Today's dispatch board",
      description:
        "Review technician lanes and today's scheduled jobs. Clear this view to return to the standard dispatch layout.",
      clearHref: "/dispatch",
    };
  }

  if (focus === "overload") {
    if (overloadedTechnicianIds.length > 0) {
      return {
        title: "Technician workload pressure",
        description:
          "Technicians highlighted below are carrying multiple active jobs today. Rebalance assignments on the board before schedules stack up.",
        clearHref: "/dispatch",
      };
    }

    return {
      title: "Technician workload on today's board",
      description:
        "No technicians currently show multiple active jobs. Use the workload cards and technician lanes below to monitor capacity as assignments change.",
      clearHref: "/dispatch",
    };
  }

  return null;
}

export function parseDispatchPageSearchParams(input: {
  focus?: string;
}): DispatchPageFocusState {
  const focus =
    input.focus && VALID_FOCUS_PARAMS.has(input.focus as DispatchPageFocus)
      ? (input.focus as DispatchPageFocus)
      : null;

  const overloadedTechnicianIds: string[] = [];

  const highlightedSummaryLabels: DispatchSummaryHighlightLabel[] = [];
  let initialTechnicianFilter: DispatchPageFocusState["initialTechnicianFilter"] =
    "all";
  let emphasizeWorkload = false;
  let emphasizeBoard = false;
  let highlightUnassignedPanel = false;
  let boardEyebrow: string | null = null;
  let boardDescription: string | null = null;

  if (focus === "unassigned") {
    initialTechnicianFilter = "unassigned";
    highlightUnassignedPanel = true;
    highlightedSummaryLabels.push("Unassigned");
    boardEyebrow = "Assignment follow-up";
    boardDescription = "Unassigned jobs on today's board";
  }

  if (focus === "today") {
    emphasizeBoard = true;
    highlightedSummaryLabels.push("Scheduled Today");
    boardEyebrow = "Today's board";
    boardDescription =
      "Technician lanes with horizontally scrollable job cards";
  }

  if (focus === "overload") {
    emphasizeWorkload = true;
    emphasizeBoard = true;
    boardEyebrow = "Workload pressure";
    boardDescription =
      "Compare technician lanes with workload cards above the board";
  }

  const bannerTemplate = resolveBannerCopy(focus, overloadedTechnicianIds);
  const banner = bannerTemplate
    ? { ...bannerTemplate, clearHref: "/dispatch" }
    : null;

  return {
    focus,
    banner,
    highlightedSummaryLabels,
    initialTechnicianFilter,
    emphasizeWorkload,
    emphasizeBoard,
    highlightUnassignedPanel,
    boardEyebrow,
    boardDescription,
    overloadedTechnicianIds,
  };
}

/** Enriches focus state with overload IDs from loaded dispatch jobs (display-only). */
export function enrichDispatchPageFocusState(
  state: DispatchPageFocusState,
  jobs: DispatchJob[],
): DispatchPageFocusState {
  if (state.focus !== "overload") {
    return state;
  }

  const overloadedTechnicianIds = getOverloadedTechnicianIds(jobs);
  const bannerTemplate = resolveBannerCopy(state.focus, overloadedTechnicianIds);

  return {
    ...state,
    overloadedTechnicianIds,
    banner: bannerTemplate
      ? { ...bannerTemplate, clearHref: "/dispatch" }
      : null,
  };
}
