"use client";

import { CheckCircle2, XCircle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  getJobNextBusinessAction,
  type JobBusinessActionOptions,
  type JobEstimateSummary,
  type JobInvoiceSummary,
} from "@/shared/lib/job-next-business-action";
import type { JobStatus } from "@/shared/types/job";
import { formatJobStatus } from "@/shared/types/job";
import {
  isTerminalJobStatus,
  shouldAcceptServerWorkflowStatus,
  type ReopenTargetJobSnapshot,
} from "@/shared/types/job-workflow";
import { JobBusinessActionGuide } from "./JobBusinessActionGuide";
import { JobWorkflowActions } from "./JobWorkflowActions";
import { JobStatusCorrectionControl } from "./JobStatusCorrectionControl";
import { ReopenCompletedJobControl } from "./ReopenCompletedJobControl";
import { StartRouteButton } from "./StartRouteButton";

type JobWorkflowControlsSection = "full" | "banners" | "actions";

type JobWorkflowControlsProps = {
  jobId: string;
  customerId: string;
  initialStatus: JobStatus;
  /** When provided, workflow state is controlled by the parent (for split header layout). */
  status?: JobStatus;
  serviceAddress: string;
  city: string;
  state: string;
  zip: string;
  canUpdateStatus: boolean;
  aiFeaturesEnabled?: boolean;
  canCorrectStatus?: boolean;
  canReopenJob?: boolean;
  reopenSnapshot?: ReopenTargetJobSnapshot;
  layout?: "header" | "stack";
  section?: JobWorkflowControlsSection;
  showMobileHint?: boolean;
  competingSheetActive?: boolean;
  businessContext?: {
    estimates: JobEstimateSummary[];
    invoices: JobInvoiceSummary[];
  };
  businessActionOptions?: JobBusinessActionOptions;
  onFieldEstimateClick?: () => void;
  onFieldApproveClick?: () => void;
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
  status: controlledStatus,
  serviceAddress,
  city,
  state,
  zip,
  canUpdateStatus,
  aiFeaturesEnabled = false,
  canCorrectStatus = false,
  canReopenJob = false,
  reopenSnapshot,
  layout = "header",
  section = "full",
  showMobileHint = true,
  competingSheetActive = false,
  businessContext,
  businessActionOptions,
  onFieldEstimateClick,
  onFieldApproveClick,
  onCompleteSheetOpenChange,
  onStatusUpdated,
}: JobWorkflowControlsProps) {
  const [internalStatus, setInternalStatus] = useState(initialStatus);
  const isControlled = controlledStatus !== undefined;
  const status = isControlled ? controlledStatus : internalStatus;

  useEffect(() => {
    if (isControlled) {
      return;
    }

    setInternalStatus((current) =>
      shouldAcceptServerWorkflowStatus(current, initialStatus)
        ? initialStatus
        : current,
    );
  }, [initialStatus, isControlled]);

  function handleStatusUpdated(nextStatus: JobStatus) {
    if (!isControlled) {
      setInternalStatus(nextStatus);
    }
    onStatusUpdated?.(nextStatus);
  }

  const isCompact = layout === "stack";
  const stackClassName = isCompact ? "space-y-1.5" : "space-y-3";
  const businessAction = useMemo(() => {
    if (!businessContext) {
      return null;
    }

    return getJobNextBusinessAction(
      {
        jobId,
        customerId,
        jobStatus: status,
        estimates: businessContext.estimates,
        invoices: businessContext.invoices,
      },
      businessActionOptions,
    );
  }, [
    businessActionOptions,
    businessContext,
    customerId,
    jobId,
    status,
  ]);

  function renderBusinessGuide(
    presentation: "full" | "status" | "cta",
  ) {
    if (!businessAction) {
      return null;
    }

    return (
      <JobBusinessActionGuide
        action={businessAction}
        layout={isCompact ? "compact" : "default"}
        presentation={presentation}
        disabled={competingSheetActive}
        onFieldEstimateClick={onFieldEstimateClick}
        onFieldApproveClick={onFieldApproveClick}
      />
    );
  }

  function renderBannersSection() {
    if (isTerminalJobStatus(status)) {
      if (status === "completed") {
        return (
          <div className={stackClassName}>
            <JobWorkflowTerminalState status={status} compact={isCompact} />
            {renderBusinessGuide("status")}
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

    const statusGuide = renderBusinessGuide("status");

    return statusGuide ? <div className={stackClassName}>{statusGuide}</div> : null;
  }

  function renderActionsSection() {
    if (isTerminalJobStatus(status)) {
      const ctaGuide = renderBusinessGuide("cta");
      return ctaGuide ? <div className={stackClassName}>{ctaGuide}</div> : null;
    }

    return (
      <div className={stackClassName}>
        <JobWorkflowActions
          jobId={jobId}
          customerId={customerId}
          status={status}
          canUpdateStatus={canUpdateStatus}
          aiFeaturesEnabled={aiFeaturesEnabled}
          layout={layout === "stack" ? "stack" : "row"}
          showMobileHint={showMobileHint}
          competingSheetActive={competingSheetActive}
          onCompleteSheetOpenChange={onCompleteSheetOpenChange}
          onStatusUpdated={handleStatusUpdated}
        />
        {renderBusinessGuide("cta")}
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

  function renderFullSection() {
    if (isTerminalJobStatus(status)) {
      if (status === "completed") {
        return (
          <div className={stackClassName}>
            <JobWorkflowTerminalState status={status} compact={isCompact} />
            {renderBusinessGuide("full")}
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
      <div className={stackClassName}>
        <JobWorkflowActions
          jobId={jobId}
          customerId={customerId}
          status={status}
          canUpdateStatus={canUpdateStatus}
          aiFeaturesEnabled={aiFeaturesEnabled}
          layout={layout === "stack" ? "stack" : "row"}
          showMobileHint={showMobileHint}
          competingSheetActive={competingSheetActive}
          onCompleteSheetOpenChange={onCompleteSheetOpenChange}
          onStatusUpdated={handleStatusUpdated}
        />
        {renderBusinessGuide("full")}
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

  if (section === "banners") {
    return renderBannersSection();
  }

  if (section === "actions") {
    return renderActionsSection();
  }

  return renderFullSection();
}
