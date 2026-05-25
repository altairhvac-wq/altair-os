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

export function getAvailableWorkflowActions(
  status: JobStatus,
): JobWorkflowAction[] {
  return WORKFLOW_ACTIONS[status];
}

export function getDisplayWorkflowActions(
  status: JobStatus,
): JobWorkflowAction[] {
  return WORKFLOW_ACTIONS[status].filter(
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
  const action = WORKFLOW_ACTIONS[currentStatus].find(
    (candidate) => candidate.id === actionId,
  );

  return action?.targetStatus ?? null;
}

export function isTerminalJobStatus(status: JobStatus): boolean {
  return status === "completed" || status === "cancelled";
}
