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
  technicianFieldHomeHeroClass,
  technicianFieldHomeHeroEyebrowClass,
  technicianFieldHomeHeroIdleClass,
  technicianFieldHomeHeroLiveClass,
} from "./technician-field-styles";

type TechnicianActiveJobHeroProps = {
  job: TechnicianJob;
  timeState: TechnicianTimeStateSnapshot;
  heroSectionLabel: string;
  aiFeaturesEnabled?: boolean;
  onSelectJob: (job: TechnicianJob) => void;
  onJobStatusUpdated?: (jobId: string, status: JobStatus) => void;
};

export function TechnicianActiveJobHero({
  job,
  timeState,
  heroSectionLabel,
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
      className={`${technicianFieldHomeHeroClass} ${
        isLive
          ? technicianFieldHomeHeroLiveClass
          : technicianFieldHomeHeroIdleClass
      }`}
    >
      <button
        type="button"
        onClick={() => onSelectJob(job)}
        className="flex w-full touch-manipulation flex-col gap-4 px-5 pb-2 pt-5 text-left transition-colors active:bg-cyan-950/[0.02]"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <p className={technicianFieldHomeHeroEyebrowClass}>
                {heroSectionLabel}
              </p>
              {isLive ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-700">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
                  Live
                </span>
              ) : null}
            </div>
            <p className="truncate text-[1.65rem] font-bold leading-tight tracking-tight text-slate-900">
              {job.customerName}
            </p>
            <p className="text-base font-medium text-slate-600">{job.jobType}</p>
            <p className="text-xs font-medium tabular-nums text-slate-400">
              {job.jobNumber}
            </p>
          </div>
          <ChevronRight
            className="mt-2 h-6 w-6 shrink-0 text-slate-300/80"
            aria-hidden
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <TechnicianJobStatusBadge status={job.status} />
        </div>

        <div className="space-y-2 text-[15px] leading-snug text-slate-600">
          <p className="flex items-start gap-2.5">
            <MapPin
              className="mt-0.5 h-[1.125rem] w-[1.125rem] shrink-0 text-cyan-600/70"
              aria-hidden
            />
            <span className="min-w-0 break-words font-medium text-slate-700">
              {hasCompleteAddress
                ? formatTechnicianJobAddress(job)
                : "No address — contact dispatch"}
            </span>
          </p>
          <p className="flex items-center gap-2.5 text-sm text-slate-500">
            <Clock
              className="h-4 w-4 shrink-0 text-slate-400"
              aria-hidden
            />
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
        className="space-y-2.5 bg-gradient-to-b from-transparent to-cyan-950/[0.03] px-5 pb-5 pt-2"
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
          primarySize="hero"
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
          heroSecondary
          onStatusUpdated={handleStatusUpdated}
        />
      </div>
    </article>
  );
}
