"use client";

import { CheckCircle2, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import type { JobStatus } from "@/shared/types/job";
import { formatJobStatus } from "@/shared/types/job";
import {
  isTerminalJobStatus,
  shouldAcceptServerWorkflowStatus,
} from "@/shared/types/job-workflow";
import { JobWorkflowActions } from "./JobWorkflowActions";
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
  layout?: "header" | "stack";
  onStatusUpdated?: (status: JobStatus) => void;
};

function JobWorkflowTerminalState({ status }: { status: JobStatus }) {
  if (status === "completed") {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
        <CheckCircle2 className="h-4 w-4 shrink-0" />
        Work completed
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-600">
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
  layout = "header",
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

  if (isTerminalJobStatus(status)) {
    return <JobWorkflowTerminalState status={status} />;
  }

  return (
    <div className="space-y-3">
      <JobWorkflowActions
        jobId={jobId}
        customerId={customerId}
        status={status}
        canUpdateStatus={canUpdateStatus}
        layout={layout === "stack" ? "stack" : "row"}
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
    </div>
  );
}
