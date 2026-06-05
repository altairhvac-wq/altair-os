"use client";

import { ChevronRight, Clock, MapPin } from "lucide-react";
import { JobWorkflowActions } from "@/shared/components/jobs/JobWorkflowActions";
import { StartRouteButton } from "@/shared/components/jobs/StartRouteButton";
import { hasCompleteServiceAddress } from "@/shared/lib/maps";
import { isLiveTechnicianJob } from "@/shared/lib/technician-dispatch-job";
import type { JobStatus } from "@/shared/types/job";
import {
  formatTechnicianJobAddress,
  formatTechnicianJobTime,
  type TechnicianJob,
} from "@/shared/types/technician";
import type { TechnicianTimeStateSnapshot } from "@/shared/types/time-entry";
import { TechnicianJobLaborStatus } from "./TechnicianJobLaborStatus";
import { TechnicianJobStatusBadge } from "./TechnicianJobStatusBadge";
import {
  technicianFieldHeroCardClass,
  technicianFieldHeroCardLiveClass,
} from "./technician-field-styles";

type TechnicianActiveJobHeroProps = {
  job: TechnicianJob;
  timeState: TechnicianTimeStateSnapshot;
  aiFeaturesEnabled?: boolean;
  onSelectJob: (job: TechnicianJob) => void;
  onJobStatusUpdated?: (jobId: string, status: JobStatus) => void;
};

export function TechnicianActiveJobHero({
  job,
  timeState,
  aiFeaturesEnabled = false,
  onSelectJob,
  onJobStatusUpdated,
}: TechnicianActiveJobHeroProps) {
  const isLive = isLiveTechnicianJob(job, timeState);
  const hasCompleteAddress = hasCompleteServiceAddress({
    serviceAddress: job.serviceAddress,
    city: job.city,
    state: job.state,
    zip: job.zip,
  });

  function handleStatusUpdated(status: JobStatus) {
    onJobStatusUpdated?.(job.id, status);
  }

  return (
    <article
      className={`${technicianFieldHeroCardClass} ${isLive ? technicianFieldHeroCardLiveClass : ""}`}
    >
      <button
        type="button"
        onClick={() => onSelectJob(job)}
        className="flex w-full touch-manipulation flex-col gap-3 px-4 pb-3 pt-4 text-left transition-colors hover:bg-slate-50/40 active:bg-slate-50/60"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1 space-y-1">
            <p className="truncate text-lg font-bold tracking-tight text-slate-900">
              {job.customerName}
            </p>
            <p className="text-sm font-medium text-slate-600">{job.jobType}</p>
            <p className="text-[11px] font-medium tabular-nums text-slate-400">
              {job.jobNumber}
            </p>
          </div>
          <ChevronRight
            className="mt-1 h-5 w-5 shrink-0 text-slate-300"
            aria-hidden
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <TechnicianJobStatusBadge status={job.status} />
          {isLive ? (
            <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-700 ring-1 ring-inset ring-emerald-600/15">
              Active
            </span>
          ) : null}
        </div>

        <div className="space-y-1.5 text-sm text-slate-600">
          <p className="flex items-start gap-2 leading-snug">
            <MapPin
              className="mt-0.5 h-4 w-4 shrink-0 text-slate-400"
              aria-hidden
            />
            <span className="min-w-0 break-words">
              {hasCompleteAddress
                ? formatTechnicianJobAddress(job)
                : "No address — contact dispatch"}
            </span>
          </p>
          <p className="flex items-center gap-2 text-xs text-slate-500">
            <Clock className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden />
            {formatTechnicianJobTime(job.scheduledDate)}
          </p>
        </div>

        <TechnicianJobLaborStatus
          jobId={job.id}
          timeState={timeState}
          compact
        />
      </button>

      <div
        className="space-y-2 border-t border-slate-100/90 px-4 pb-4 pt-3"
        onClick={(event) => event.stopPropagation()}
        onKeyDown={(event) => event.stopPropagation()}
      >
        <JobWorkflowActions
          jobId={job.id}
          customerId={job.customerId}
          status={job.status}
          canUpdateStatus
          aiFeaturesEnabled={aiFeaturesEnabled}
          layout="stack"
          showMobileHint={false}
          onStatusUpdated={handleStatusUpdated}
        />
        <StartRouteButton
          jobId={job.id}
          status={job.status}
          serviceAddress={job.serviceAddress}
          city={job.city}
          state={job.state}
          zip={job.zip}
          canUpdateStatus
          layout="inline"
          onStatusUpdated={handleStatusUpdated}
        />
      </div>
    </article>
  );
}
