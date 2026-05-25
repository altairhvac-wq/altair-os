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
      label: "Dispatch",
      targetStatus: "dispatched",
      variant: "primary",
    },
    {
      id: "cancel",
      label: "Cancel",
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
      label: "Cancel",
      targetStatus: "cancelled",
      variant: "danger",
    },
  ],
  in_progress: [
    {
      id: "complete",
      label: "Complete",
      targetStatus: "completed",
      variant: "primary",
    },
    {
      id: "cancel",
      label: "Cancel",
      targetStatus: "cancelled",
      variant: "danger",
    },
  ],
  completed: [],
  cancelled: [],
};

export function getAvailableWorkflowActions(
  status: JobStatus,
): JobWorkflowAction[] {
  return WORKFLOW_ACTIONS[status];
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
