import type { JobStatus } from "@/shared/types/job";

export type JobWorkflowActionId =
  | "dispatch"
  | "arrive"
  | "start_work"
  | "complete"
  | "cancel";

export type JobWorkflowAction = {
  id: JobWorkflowActionId;
  label: string;
  targetStatus: JobStatus;
  variant: "primary" | "danger";
};

export type JobWorkflowCompletionPayload = {
  completionNotes?: string;
  followUpNotes?: string;
};

const WORKFLOW_ACTIONS: Record<JobStatus, JobWorkflowAction[]> = {
  scheduled: [
    {
      id: "dispatch",
      label: "En Route",
      targetStatus: "dispatched",
      variant: "primary",
    },
    {
      id: "cancel",
      label: "Cancel Job",
      targetStatus: "cancelled",
      variant: "danger",
    },
  ],
  dispatched: [
    {
      id: "arrive",
      label: "Arrived on site",
      targetStatus: "arrived",
      variant: "primary",
    },
    {
      id: "cancel",
      label: "Cancel Job",
      targetStatus: "cancelled",
      variant: "danger",
    },
  ],
  arrived: [
    {
      id: "start_work",
      label: "Start work",
      targetStatus: "in_progress",
      variant: "primary",
    },
    {
      id: "cancel",
      label: "Cancel Job",
      targetStatus: "cancelled",
      variant: "danger",
    },
  ],
  in_progress: [
    {
      id: "complete",
      label: "Complete work",
      targetStatus: "completed",
      variant: "primary",
    },
    {
      id: "cancel",
      label: "Cancel Job",
      targetStatus: "cancelled",
      variant: "danger",
    },
  ],
  completed: [],
  cancelled: [],
};

const DISPLAY_EXCLUDED_ACTION_IDS = new Set<JobWorkflowActionId>(["dispatch"]);

function getWorkflowActionsForStatus(status: JobStatus): JobWorkflowAction[] {
  return WORKFLOW_ACTIONS[status] ?? [];
}

export function getAvailableWorkflowActions(
  status: JobStatus,
): JobWorkflowAction[] {
  return getWorkflowActionsForStatus(status);
}

export function getDisplayWorkflowActions(
  status: JobStatus,
): JobWorkflowAction[] {
  return getWorkflowActionsForStatus(status).filter(
    (action) => !DISPLAY_EXCLUDED_ACTION_IDS.has(action.id),
  );
}

export function getPrimaryWorkflowAction(
  status: JobStatus,
): JobWorkflowAction | null {
  return (
    getDisplayWorkflowActions(status).find(
      (action) => action.variant === "primary",
    ) ?? null
  );
}

export function getTargetStatusForAction(
  currentStatus: JobStatus,
  actionId: JobWorkflowActionId,
): JobStatus | null {
  const action = getWorkflowActionsForStatus(currentStatus).find(
    (candidate) => candidate.id === actionId,
  );

  return action?.targetStatus ?? null;
}

export function isTerminalJobStatus(status: JobStatus): boolean {
  return status === "completed" || status === "cancelled";
}

export function isIdempotentWorkflowAction(
  currentStatus: JobStatus,
  actionId: JobWorkflowActionId,
): boolean {
  return (
    (actionId === "complete" && currentStatus === "completed") ||
    (actionId === "cancel" && currentStatus === "cancelled")
  );
}

const WORKFLOW_STATUS_RANK: Record<JobStatus, number> = {
  scheduled: 0,
  dispatched: 1,
  arrived: 2,
  in_progress: 3,
  completed: 4,
  cancelled: -1,
};

export function shouldAcceptServerWorkflowStatus(
  localStatus: JobStatus,
  serverStatus: JobStatus,
): boolean {
  if (localStatus === serverStatus) {
    return false;
  }

  if (isTerminalJobStatus(serverStatus) || isTerminalJobStatus(localStatus)) {
    return true;
  }

  if (isAllowedStatusCorrection(localStatus, serverStatus)) {
    return true;
  }

  return (
    WORKFLOW_STATUS_RANK[serverStatus] >= WORKFLOW_STATUS_RANK[localStatus]
  );
}

const STATUS_CORRECTION_TARGETS: Partial<Record<JobStatus, JobStatus[]>> = {
  dispatched: ["scheduled"],
  arrived: ["dispatched"],
  in_progress: ["arrived", "dispatched"],
};

export function getAllowedStatusCorrectionTargets(
  status: JobStatus,
): JobStatus[] {
  if (isTerminalJobStatus(status)) {
    return [];
  }

  return STATUS_CORRECTION_TARGETS[status] ?? [];
}

export function isAllowedStatusCorrection(
  fromStatus: JobStatus,
  toStatus: JobStatus,
): boolean {
  if (fromStatus === toStatus) {
    return false;
  }

  if (isTerminalJobStatus(fromStatus) || isTerminalJobStatus(toStatus)) {
    return false;
  }

  return getAllowedStatusCorrectionTargets(fromStatus).includes(toStatus);
}

export function canCorrectJobStatus(status: JobStatus): boolean {
  return getAllowedStatusCorrectionTargets(status).length > 0;
}
