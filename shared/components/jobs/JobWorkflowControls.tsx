"use client";

import { useEffect, useState } from "react";
import type { JobStatus } from "@/shared/types/job";
import { isTerminalJobStatus } from "@/shared/types/job-workflow";
import { JobWorkflowActions } from "./JobWorkflowActions";
import { StartRouteButton } from "./StartRouteButton";

type JobWorkflowControlsProps = {
  jobId: string;
  initialStatus: JobStatus;
  serviceAddress: string;
  city: string;
  state: string;
  zip: string;
  canUpdateStatus: boolean;
  layout?: "header" | "stack";
  onStatusUpdated?: (status: JobStatus) => void;
};

export function JobWorkflowControls({
  jobId,
  initialStatus,
  serviceAddress,
  city,
  state,
  zip,
  canUpdateStatus,
  layout = "header",
  onStatusUpdated,
}: JobWorkflowControlsProps) {
  const [status, setStatus] = useState(initialStatus);

  useEffect(() => {
    setStatus(initialStatus);
  }, [initialStatus]);

  function handleStatusUpdated(nextStatus: JobStatus) {
    setStatus(nextStatus);
    onStatusUpdated?.(nextStatus);
  }

  if (isTerminalJobStatus(status)) {
    return null;
  }

  return (
    <div className="space-y-3">
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
      <JobWorkflowActions
        jobId={jobId}
        status={status}
        canUpdateStatus={canUpdateStatus}
        layout={layout === "stack" ? "stack" : "row"}
        onStatusUpdated={handleStatusUpdated}
      />
    </div>
  );
}
