"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { updateJobStatusAction } from "@/app/actions/jobs";
import type { JobStatus } from "@/shared/types/job";
import {
  getDisplayWorkflowActions,
  getPrimaryWorkflowAction,
  isTerminalJobStatus,
  type JobWorkflowAction,
  type JobWorkflowActionId,
} from "@/shared/types/job-workflow";
import { CompleteJobSheet } from "./CompleteJobSheet";

type JobWorkflowActionsProps = {
  jobId: string;
  customerId: string;
  status: JobStatus;
  canUpdateStatus: boolean;
  layout?: "row" | "stack";
  onStatusUpdated?: (status: JobStatus) => void;
};

export function JobWorkflowActions({
  jobId,
  customerId,
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
  const [showCompleteSheet, setShowCompleteSheet] = useState(false);

  const isCompact = layout === "stack";
  const primaryAction = getPrimaryWorkflowAction(status);
  const secondaryActions = isCompact
    ? []
    : getDisplayWorkflowActions(status).filter(
        (action) => action.variant === "danger",
      );

  if (!canUpdateStatus || isTerminalJobStatus(status) || !primaryAction) {
    return null;
  }

  function renderActionButton(action: JobWorkflowAction) {
    const isActionPending = isPending && pendingAction === action.id;
    const isPrimary = action.variant === "primary";

    return (
      <button
        key={action.id}
        type="button"
        onClick={() => handleAction(action.id)}
        disabled={isPending}
        className={
          isPrimary
            ? isCompact
              ? "inline-flex w-full items-center justify-center rounded-xl bg-cyan-600 px-4 py-3.5 text-base font-semibold text-white transition-colors hover:bg-cyan-700 disabled:cursor-not-allowed disabled:opacity-60"
              : "inline-flex w-full items-center justify-center rounded-lg bg-cyan-600 px-4 py-3 sm:w-auto sm:px-3.5 sm:py-2 text-base sm:text-sm font-semibold text-white transition-colors hover:bg-cyan-700 disabled:cursor-not-allowed disabled:opacity-60"
            : "inline-flex w-full items-center justify-center rounded-lg border border-red-200 bg-white px-4 py-3 sm:w-auto sm:px-3.5 sm:py-2 text-base sm:text-sm font-semibold text-red-700 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
        }
      >
        {isActionPending ? "Updating..." : action.label}
      </button>
    );
  }

  function handleAction(actionId: JobWorkflowActionId) {
    if (isPending) {
      return;
    }

    if (actionId === "complete") {
      setError(null);
      setSuccessMessage(null);
      setShowCompleteSheet(true);
      return;
    }

    setError(null);
    setSuccessMessage(null);
    setPendingAction(actionId);

    startTransition(async () => {
      const result = await updateJobStatusAction(jobId, actionId, status);

      setPendingAction(null);

      if (!result.job) {
        setError(result.error ?? "Failed to update job status.");
        return;
      }

      if (result.error) {
        setError(result.error);
        onStatusUpdated?.(result.job.status);
        router.refresh();
        return;
      }

      const actionLabel =
        actionId === primaryAction?.id
          ? primaryAction.label
          : (secondaryActions.find((candidate) => candidate.id === actionId)
              ?.label ?? "Status");
      setSuccessMessage(`${actionLabel} updated successfully.`);
      onStatusUpdated?.(result.job.status);
      router.refresh();
    });
  }

  const actionRowClass =
    layout === "stack"
      ? "flex flex-col gap-2"
      : "flex flex-col gap-2 sm:flex-row sm:flex-wrap";

  return (
    <>
      <div className={layout === "stack" ? "space-y-3" : "space-y-2"}>
        <div className={actionRowClass}>{renderActionButton(primaryAction)}</div>
        {secondaryActions.length > 0 ? (
          <div className={actionRowClass}>
            {secondaryActions.map(renderActionButton)}
          </div>
        ) : null}

        {error ? (
          <p className="break-words text-sm text-red-600" role="alert">
            {error}
          </p>
        ) : null}
        {successMessage ? (
          <p className="text-sm text-emerald-700">{successMessage}</p>
        ) : null}
      </div>

      {showCompleteSheet ? (
        <CompleteJobSheet
          jobId={jobId}
          customerId={customerId}
          currentStatus={status}
          onClose={() => setShowCompleteSheet(false)}
          onCompleted={(nextStatus) => {
            setSuccessMessage("Work completed successfully.");
            onStatusUpdated?.(nextStatus);
          }}
        />
      ) : null}
    </>
  );
}
