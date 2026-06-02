"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Calendar, Pencil, Truck } from "lucide-react";
import type { JobDetail } from "@/shared/types/job";
import {
  type JobEstimateSummary,
  type JobInvoiceSummary,
} from "@/shared/lib/job-next-business-action";
import { shouldAcceptServerWorkflowStatus } from "@/shared/types/job-workflow";
import { JobPriorityBadge } from "./JobPriorityBadge";
import { JobStatusBadge } from "./JobStatusBadge";
import { JobWorkflowControls } from "./JobWorkflowControls";

type JobDetailHeaderWorkflowProps = {
  job: JobDetail;
  scheduledLabel: string;
  canUpdateStatus: boolean;
  canEditJob: boolean;
  aiFeaturesEnabled?: boolean;
  canCreateEstimate?: boolean;
  canViewBilling?: boolean;
  billingContext?: {
    estimates: JobEstimateSummary[];
    invoices: JobInvoiceSummary[];
  };
  onEdit: () => void;
};

const workflowControlsProps = (
  props: JobDetailHeaderWorkflowProps,
  status: JobDetail["status"],
  onStatusUpdated: (status: JobDetail["status"]) => void,
) => ({
  jobId: props.job.id,
  customerId: props.job.customerId,
  initialStatus: status,
  status,
  serviceAddress: props.job.serviceAddress,
  city: props.job.city,
  state: props.job.state,
  zip: props.job.zip,
  canUpdateStatus: props.canUpdateStatus,
  aiFeaturesEnabled: props.aiFeaturesEnabled,
  canCorrectStatus: props.canEditJob,
  canReopenJob: props.canEditJob,
  businessContext: props.billingContext,
  businessActionOptions: {
    canCreateEstimate: props.canCreateEstimate,
    canViewBilling: props.canViewBilling,
  },
  reopenSnapshot: {
    workStartedAt: props.job.workStartedAt,
    arrivedAt: props.job.arrivedAt,
    assignedTechnicianId: props.job.assignedTechnicianId,
  },
  layout: "header" as const,
  onStatusUpdated,
});

export function JobDetailHeaderWorkflow({
  job,
  scheduledLabel,
  canUpdateStatus,
  canEditJob,
  aiFeaturesEnabled = false,
  canCreateEstimate = false,
  canViewBilling = false,
  billingContext,
  onEdit,
}: JobDetailHeaderWorkflowProps) {
  const [status, setStatus] = useState(job.status);

  useEffect(() => {
    setStatus((current) =>
      shouldAcceptServerWorkflowStatus(current, job.status)
        ? job.status
        : current,
    );
  }, [job.status]);

  function handleStatusUpdated(nextStatus: typeof job.status) {
    setStatus(nextStatus);
  }

  const sharedWorkflowProps = workflowControlsProps(
    {
      job,
      scheduledLabel,
      canUpdateStatus,
      canEditJob,
      aiFeaturesEnabled,
      canCreateEstimate,
      canViewBilling,
      billingContext,
      onEdit,
    },
    status,
    handleStatusUpdated,
  );

  return (
    <div className="flex flex-col gap-4">
      <JobWorkflowControls {...sharedWorkflowProps} section="banners" />

      <div className="min-w-0 space-y-1">
        <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
          {job.jobNumber}
        </h1>
        <p className="text-sm font-medium text-slate-700">{job.jobType}</p>
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
          <JobStatusBadge status={status} />
          <JobPriorityBadge priority={job.priority} />
          <span className="hidden text-slate-300 sm:inline" aria-hidden>
            ·
          </span>
          <div className="flex items-center gap-1.5 text-sm text-slate-600">
            <Calendar className="h-4 w-4 shrink-0 text-slate-400" />
            <span>{scheduledLabel}</span>
          </div>
        </div>

        <div className="flex w-full flex-col gap-3 lg:w-auto lg:shrink-0 lg:items-end">
          <JobWorkflowControls {...sharedWorkflowProps} section="actions" />
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap lg:justify-end">
            {canEditJob ? (
              <button
                type="button"
                onClick={onEdit}
                className="inline-flex w-full min-h-11 items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-slate-800 sm:w-auto sm:px-3.5 sm:py-2"
              >
                <Pencil className="h-4 w-4" />
                Edit job
              </button>
            ) : null}
            <Link
              href="/dispatch"
              className="inline-flex w-full min-h-11 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 sm:w-auto sm:px-3.5 sm:py-2"
            >
              <Truck className="h-4 w-4" />
              Open dispatch
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
