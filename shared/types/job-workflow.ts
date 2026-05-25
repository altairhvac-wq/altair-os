import type { JobStatus } from "@/shared/types/job";

export type JobWorkflowActionId =
  | "dispatch"
  | "start_work"
  | "complete"
  | "cancel";

export type JobWorkflowAction = {
  id: JobWorkflowActionId;
  label: string;
  targetStatus: JobStatus;
  variant: "primary" | "danger";
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
      id: "start_work",
      label: "Start Work",
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
      label: "Complete Job",
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
