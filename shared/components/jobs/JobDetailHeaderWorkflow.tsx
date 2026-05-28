"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Calendar, Pencil, Truck } from "lucide-react";
import type { JobDetail } from "@/shared/types/job";
import { JobPriorityBadge } from "./JobPriorityBadge";
import { JobStatusBadge } from "./JobStatusBadge";
import { JobWorkflowControls } from "./JobWorkflowControls";

type JobDetailHeaderWorkflowProps = {
  job: JobDetail;
  scheduledLabel: string;
  canUpdateStatus: boolean;
  canEditJob: boolean;
  onEdit: () => void;
};

export function JobDetailHeaderWorkflow({
  job,
  scheduledLabel,
  canUpdateStatus,
  canEditJob,
  onEdit,
}: JobDetailHeaderWorkflowProps) {
  const [status, setStatus] = useState(job.status);

  useEffect(() => {
    setStatus(job.status);
  }, [job.status]);

  function handleStatusUpdated(nextStatus: typeof job.status) {
    setStatus(nextStatus);
  }

  return (
    <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
      <div className="min-w-0 space-y-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Job
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            {job.jobNumber}
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-2">
          <span className="text-sm font-medium text-slate-700">{job.jobType}</span>
          <span className="hidden text-slate-300 sm:inline" aria-hidden>
            ·
          </span>
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
      </div>

      <div className="flex flex-col gap-3 lg:shrink-0 lg:items-end">
        <JobWorkflowControls
          jobId={job.id}
          customerId={job.customerId}
          initialStatus={status}
          serviceAddress={job.serviceAddress}
          city={job.city}
          state={job.state}
          zip={job.zip}
          canUpdateStatus={canUpdateStatus}
          canCorrectStatus={canEditJob}
          layout="header"
          onStatusUpdated={handleStatusUpdated}
        />
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
  );
}
