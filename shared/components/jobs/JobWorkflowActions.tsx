"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { updateJobStatusAction } from "@/app/actions/jobs";
import { formatActionError } from "@/shared/lib/operational-errors";
import type { JobStatus } from "@/shared/types/job";
import {
  getDisplayWorkflowActions,
  getPrimaryWorkflowAction,
  isTerminalJobStatus,
  type JobWorkflowAction,
  type JobWorkflowActionId,
} from "@/shared/types/job-workflow";
import { CompleteJobSheet } from "./CompleteJobSheet";

function getMobileWorkflowHint(
  status: JobStatus,
  primaryActionId: JobWorkflowActionId | undefined,
  short = false,
): string | null {
  if (status === "in_progress") {
    if (primaryActionId === "complete") {
      return short
        ? "Tap Complete work when the job is done on site."
        : "This job is active on site. Complete work opens a wrap-up form that marks the job finished for the office.";
    }
    return short ? "Job is active on site." : "This job is active on site.";
  }

  switch (status) {
    case "scheduled":
      return short
        ? "Start route when you leave, then mark arrived."
        : "Next: start route when you leave for this job, then mark arrived on site.";
    case "dispatched":
      return short
        ? "Mark arrived when you reach the customer."
        : "You are en route. Mark arrived on site when you reach the customer.";
    case "arrived":
      return short
        ? "Start work clocks you in automatically."
        : "On site. Start work clocks you in and begins job labor automatically.";
    default:
      return null;
  }
}

type JobWorkflowActionsProps = {
  jobId: string;
  customerId: string;
  status: JobStatus;
  canUpdateStatus: boolean;
  aiFeaturesEnabled?: boolean;
  layout?: "row" | "stack";
  showMobileHint?: boolean;
  shortHints?: boolean;
  competingSheetActive?: boolean;
  onCompleteSheetOpenChange?: (open: boolean) => void;
  onStatusUpdated?: (status: JobStatus) => void;
};

export function JobWorkflowActions({
  jobId,
  customerId,
  status,
  canUpdateStatus,
  aiFeaturesEnabled = false,
  layout = "row",
  showMobileHint = true,
  shortHints = false,
  competingSheetActive = false,
  onCompleteSheetOpenChange,
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

  useEffect(() => {
    onCompleteSheetOpenChange?.(showCompleteSheet);
  }, [onCompleteSheetOpenChange, showCompleteSheet]);

  useEffect(() => {
    return () => {
      onCompleteSheetOpenChange?.(false);
    };
  }, [onCompleteSheetOpenChange]);

  const workflowActionsDisabled =
    isPending || showCompleteSheet || competingSheetActive;

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
        disabled={workflowActionsDisabled}
        className={
          isPrimary
            ? isCompact
              ? "inline-flex min-h-12 w-full touch-manipulation items-center justify-center rounded-xl bg-cyan-600 px-4 py-3 text-base font-bold text-white shadow-sm transition-colors hover:bg-cyan-700 active:bg-cyan-800 disabled:cursor-not-allowed disabled:opacity-60"
              : "inline-flex w-full items-center justify-center rounded-lg bg-cyan-600 px-4 py-3 sm:w-auto sm:px-3.5 sm:py-2 text-base sm:text-sm font-semibold text-white transition-colors hover:bg-cyan-700 disabled:cursor-not-allowed disabled:opacity-60"
            : "inline-flex w-full items-center justify-center rounded-lg border border-red-200 bg-white px-4 py-3 sm:w-auto sm:px-3.5 sm:py-2 text-base sm:text-sm font-semibold text-red-700 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
        }
      >
        {isActionPending ? "Saving…" : action.label}
      </button>
    );
  }

  function handleAction(actionId: JobWorkflowActionId) {
    if (workflowActionsDisabled) {
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
      try {
        const result = await updateJobStatusAction(jobId, actionId, status);

        if (!result.job) {
          setError(formatActionError(result.error, "We couldn't update this job's status. Try again."));
          if (result.error?.includes("assigned")) {
            router.refresh();
          }
          return;
        }

        if (result.error) {
          setError(formatActionError(result.error, "We couldn't update this job's status. Try again."));
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
        window.setTimeout(() => router.refresh(), 500);
      } finally {
        setPendingAction(null);
      }
    });
  }

  const actionRowClass =
    layout === "stack"
      ? "flex flex-col gap-2"
      : "flex flex-col gap-2 sm:flex-row sm:flex-wrap";

  const mobileHint =
    isCompact && showMobileHint
      ? getMobileWorkflowHint(status, primaryAction.id, shortHints)
      : null;

  return (
    <>
      <div className={layout === "stack" ? "space-y-2" : "space-y-2"}>
        {mobileHint ? (
          <p className="text-xs leading-relaxed text-slate-500">
            {competingSheetActive
              ? "Close the open field form before completing work."
              : mobileHint}
          </p>
        ) : null}
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
          aiFeaturesEnabled={aiFeaturesEnabled}
          onClose={() => setShowCompleteSheet(false)}
          onCompleted={(nextStatus, outcome) => {
            if (outcome === "success") {
              setSuccessMessage("Work completed successfully.");
              onStatusUpdated?.(nextStatus);
            }
          }}
        />
      ) : null}
    </>
  );
}
