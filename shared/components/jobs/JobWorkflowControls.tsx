"use client";

import { CheckCircle2, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import type { JobStatus } from "@/shared/types/job";
import { formatJobStatus } from "@/shared/types/job";
import {
  isTerminalJobStatus,
  shouldAcceptServerWorkflowStatus,
  type ReopenTargetJobSnapshot,
} from "@/shared/types/job-workflow";
import { JobWorkflowActions } from "./JobWorkflowActions";
import { JobStatusCorrectionControl } from "./JobStatusCorrectionControl";
import { ReopenCompletedJobControl } from "./ReopenCompletedJobControl";
import { StartRouteButton } from "./StartRouteButton";

type JobWorkflowControlsProps = {
  jobId: string;
  customerId: string;
  initialStatus: JobStatus;
  serviceAddress: string;
  city: string;
  state: string;
  zip: string;
  canUpdateStatus: boolean;
  canCorrectStatus?: boolean;
  canReopenJob?: boolean;
  reopenSnapshot?: ReopenTargetJobSnapshot;
  layout?: "header" | "stack";
  showMobileHint?: boolean;
  competingSheetActive?: boolean;
  onCompleteSheetOpenChange?: (open: boolean) => void;
  onStatusUpdated?: (status: JobStatus) => void;
};

function JobWorkflowTerminalState({
  status,
  compact = false,
}: {
  status: JobStatus;
  compact?: boolean;
}) {
  if (status === "completed") {
    return (
      <div className="space-y-1.5">
        <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          Work completed
        </div>
        {compact ? (
          <p className="text-xs text-slate-500">
            This job is closed. Use Resume below only if more field work is
            needed.
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-600">
      <XCircle className="h-4 w-4 shrink-0" />
      {formatJobStatus(status)}
    </div>
  );
}

export function JobWorkflowControls({
  jobId,
  customerId,
  initialStatus,
  serviceAddress,
  city,
  state,
  zip,
  canUpdateStatus,
  canCorrectStatus = false,
  canReopenJob = false,
  reopenSnapshot,
  layout = "header",
  showMobileHint = true,
  competingSheetActive = false,
  onCompleteSheetOpenChange,
  onStatusUpdated,
}: JobWorkflowControlsProps) {
  const [status, setStatus] = useState(initialStatus);

  useEffect(() => {
    setStatus((current) =>
      shouldAcceptServerWorkflowStatus(current, initialStatus)
        ? initialStatus
        : current,
    );
  }, [initialStatus]);

  function handleStatusUpdated(nextStatus: JobStatus) {
    setStatus(nextStatus);
    onStatusUpdated?.(nextStatus);
  }

  const isCompact = layout === "stack";

  if (isTerminalJobStatus(status)) {
    if (status === "completed") {
      return (
        <div className="space-y-3">
          <JobWorkflowTerminalState status={status} compact={isCompact} />
          <ReopenCompletedJobControl
            jobId={jobId}
            status={status}
            canReopenJob={canReopenJob}
            reopenSnapshot={
              reopenSnapshot ?? {
                workStartedAt: undefined,
                arrivedAt: undefined,
                assignedTechnicianId: undefined,
              }
            }
            onStatusUpdated={handleStatusUpdated}
          />
        </div>
      );
    }

    return <JobWorkflowTerminalState status={status} compact={isCompact} />;
  }

  return (
    <div className={isCompact ? "space-y-2" : "space-y-3"}>
      <JobWorkflowActions
        jobId={jobId}
        customerId={customerId}
        status={status}
        canUpdateStatus={canUpdateStatus}
        layout={layout === "stack" ? "stack" : "row"}
        showMobileHint={showMobileHint}
        competingSheetActive={competingSheetActive}
        onCompleteSheetOpenChange={onCompleteSheetOpenChange}
        onStatusUpdated={handleStatusUpdated}
      />
      <StartRouteButton
        jobId={jobId}
        status={status}
        serviceAddress={serviceAddress}
        city={city}
        state={state}
        zip={zip}
        canUpdateStatus={canUpdateStatus}
        layout={layout === "stack" ? "block" : "inline"}
        onStatusUpdated={handleStatusUpdated}
      />
      <JobStatusCorrectionControl
        jobId={jobId}
        status={status}
        canCorrectStatus={canCorrectStatus}
        onStatusUpdated={handleStatusUpdated}
      />
    </div>
  );
}
