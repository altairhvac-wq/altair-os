"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { updateJobStatusAction } from "@/app/actions/jobs";
import type { JobStatus } from "@/shared/types/job";
import {
  getDisplayWorkflowActions,
  isTerminalJobStatus,
  type JobWorkflowAction,
  type JobWorkflowActionId,
} from "@/shared/types/job-workflow";

type JobWorkflowActionsProps = {
  jobId: string;
  status: JobStatus;
  canUpdateStatus: boolean;
  layout?: "row" | "stack";
  onStatusUpdated?: (status: JobStatus) => void;
};

export function JobWorkflowActions({
  jobId,
  status,
  canUpdateStatus,
  layout = "row",
  onStatusUpdated,
}: JobWorkflowActionsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [pendingAction, setPendingAction] = useState<JobWorkflowActionId | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const actions = getDisplayWorkflowActions(status);
  const primaryActions = actions.filter((action) => action.variant === "primary");
  const secondaryActions = actions.filter((action) => action.variant === "danger");

  if (!canUpdateStatus || isTerminalJobStatus(status) || actions.length === 0) {
    return null;
  }

  function renderActionButton(action: JobWorkflowAction) {
    const isActionPending = isPending && pendingAction === action.id;

    return (
      <button
        key={action.id}
        type="button"
        onClick={() => handleAction(action.id)}
        disabled={isPending}
        className={
          action.variant === "primary"
            ? "inline-flex items-center justify-center rounded-lg bg-cyan-600 px-3.5 py-2 text-sm font-semibold text-white transition-colors hover:bg-cyan-700 disabled:cursor-not-allowed disabled:opacity-60"
            : "inline-flex items-center justify-center rounded-lg border border-red-200 bg-white px-3.5 py-2 text-sm font-semibold text-red-700 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
        }
      >
        {isActionPending ? "Updating..." : action.label}
      </button>
    );
  }

  function handleAction(actionId: JobWorkflowActionId) {
    setError(null);
    setSuccessMessage(null);
    setPendingAction(actionId);

    startTransition(async () => {
      const result = await updateJobStatusAction(jobId, actionId, status);

      setPendingAction(null);

      if (result.error || !result.job) {
        setError(result.error ?? "Failed to update job status.");
        return;
      }

      const actionLabel =
        actions.find((action) => action.id === actionId)?.label ?? "Status";
      setSuccessMessage(`${actionLabel} updated successfully.`);

      onStatusUpdated?.(result.job.status);
      router.refresh();
    });
  }

  const actionRowClass =
    layout === "stack" ? "flex flex-col gap-2" : "flex flex-wrap gap-2";

  return (
    <div className={layout === "stack" ? "space-y-3" : "space-y-2"}>
      {primaryActions.length > 0 ? (
        <div className={actionRowClass}>{primaryActions.map(renderActionButton)}</div>
      ) : null}
      {secondaryActions.length > 0 ? (
        <div className={actionRowClass}>
          {secondaryActions.map(renderActionButton)}
        </div>
      ) : null}

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {successMessage ? (
        <p className="text-sm text-emerald-700">{successMessage}</p>
      ) : null}
    </div>
  );
}
