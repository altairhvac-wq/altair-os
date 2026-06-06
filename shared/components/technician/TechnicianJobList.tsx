"use client";

import { ChevronRight, MapPin } from "lucide-react";
import { isLiveTechnicianJob } from "@/shared/lib/technician-dispatch-job";
import type { JobStatus } from "@/shared/types/job";
import {
  formatTechnicianJobTime,
  type TechnicianJob,
} from "@/shared/types/technician";
import type { TechnicianTimeStateSnapshot } from "@/shared/types/time-entry";
import { TechnicianActiveJobHero } from "./TechnicianActiveJobHero";
import { TechnicianJobStatusBadge } from "./TechnicianJobStatusBadge";
import {
  technicianFieldUpNextMutedLabelClass,
  technicianFieldUpNextRowClass,
} from "./technician-field-styles";

type TechnicianJobListProps = {
  jobs: TechnicianJob[];
  selectedJobId: string | null;
  timeState: TechnicianTimeStateSnapshot;
  heroSectionLabel: string;
  heroSectionAriaLabel: string;
  /** Resets the mobile carousel when the schedule day changes. */
  deckKey?: string;
  aiFeaturesEnabled?: boolean;
  onSelectJob: (job: TechnicianJob) => void;
  onJobStatusUpdated?: (jobId: string, status: JobStatus) => void;
};

function formatUpNextJobLocation(job: TechnicianJob): string {
  const city = job.city.trim();
  const state = job.state.trim();

  if (city && state) {
    return `${city}, ${state}`;
  }

  if (city) {
    return city;
  }

  if (state) {
    return state;
  }

  return "Address TBD";
}

function resolveHeroJob(
  jobs: TechnicianJob[],
  timeState: TechnicianTimeStateSnapshot,
): TechnicianJob {
  const liveJob = jobs.find((job) => isLiveTechnicianJob(job, timeState));
  return liveJob ?? jobs[0];
}

function TechnicianUpNextJobRow({
  job,
  isHighlighted,
  onSelectJob,
}: {
  job: TechnicianJob;
  isHighlighted: boolean;
  onSelectJob: (job: TechnicianJob) => void;
}) {
  const location = formatUpNextJobLocation(job);

  return (
    <button
      type="button"
      onClick={() => onSelectJob(job)}
      className={`${technicianFieldUpNextRowClass} ${
        isHighlighted ? "bg-cyan-50/40" : ""
      }`}
    >
      <div className="min-w-0 flex-1 space-y-0.5">
        <div className="flex items-baseline justify-between gap-2">
          <p className="truncate text-sm font-semibold text-slate-800">
            {job.customerName}
          </p>
          <span className="shrink-0 text-[11px] font-medium tabular-nums text-slate-400">
            {formatTechnicianJobTime(job.scheduledDate)}
          </span>
        </div>
        <p className="truncate text-xs text-slate-500">{job.jobType}</p>
        <div className="flex items-center gap-3 pt-0.5">
          <p className="flex min-w-0 items-center gap-1 truncate text-[11px] text-slate-500">
            <MapPin className="h-3 w-3 shrink-0 text-slate-400" aria-hidden />
            <span className="truncate">{location}</span>
          </p>
          <TechnicianJobStatusBadge
            status={job.status}
            className="shrink-0 text-[9px]"
          />
        </div>
      </div>
      <ChevronRight
        className="h-4 w-4 shrink-0 text-slate-300"
        aria-hidden
      />
    </button>
  );
}

export function TechnicianJobList({
  jobs,
  selectedJobId,
  timeState,
  heroSectionLabel,
  heroSectionAriaLabel,
  deckKey,
  aiFeaturesEnabled = false,
  onSelectJob,
  onJobStatusUpdated,
}: TechnicianJobListProps) {
  if (jobs.length === 0) {
    return null;
  }

  const heroJob = resolveHeroJob(jobs, timeState);
  const upNextJobs = jobs.filter((job) => job.id !== heroJob.id);

  function isHighlighted(job: TechnicianJob): boolean {
    const isLive = isLiveTechnicianJob(job, timeState);
    return selectedJobId === job.id || (selectedJobId === null && isLive);
  }

  return (
    <div className="space-y-5">
      <section
        className="-mx-4 sm:-mx-5"
        aria-label={heroSectionAriaLabel}
      >
        <TechnicianActiveJobHero
          job={heroJob}
          timeState={timeState}
          heroSectionLabel={heroSectionLabel}
          aiFeaturesEnabled={aiFeaturesEnabled}
          onSelectJob={onSelectJob}
          onJobStatusUpdated={onJobStatusUpdated}
        />
      </section>

      {upNextJobs.length > 0 ? (
        <section
          key={deckKey}
          className="space-y-1 px-0.5"
          aria-label="Up next jobs"
          data-no-pull-refresh
        >
          <div className="flex items-baseline gap-2 pb-1">
            <h2 className={technicianFieldUpNextMutedLabelClass}>Up next</h2>
            <span className="text-[10px] font-medium tabular-nums text-slate-400">
              {upNextJobs.length} more
            </span>
          </div>

          <div className="divide-y divide-slate-100/90">
            {upNextJobs.map((job) => (
              <TechnicianUpNextJobRow
                key={job.id}
                job={job}
                isHighlighted={isHighlighted(job)}
                onSelectJob={onSelectJob}
              />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
