"use client";

import { Clock, MapPin } from "lucide-react";
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
  technicianFieldSectionLabelClass,
  technicianFieldSurfaceCardClass,
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

function TechnicianUpNextJobCard({
  job,
  isHighlighted,
  fullWidth = false,
  onSelectJob,
}: {
  job: TechnicianJob;
  isHighlighted: boolean;
  fullWidth?: boolean;
  onSelectJob: (job: TechnicianJob) => void;
}) {
  const location = formatUpNextJobLocation(job);

  return (
    <button
      type="button"
      onClick={() => onSelectJob(job)}
      className={`${technicianFieldSurfaceCardClass} snap-start p-3.5 text-left ${
        fullWidth
          ? "w-full"
          : "w-[14.5rem] shrink-0 sm:w-[15.5rem]"
      } ${
        isHighlighted
          ? "ring-2 ring-cyan-500/25"
          : ""
      }`}
    >
      <div className="space-y-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-slate-900">
            {job.customerName}
          </p>
          <p className="truncate text-xs text-slate-500">{job.jobType}</p>
        </div>

        <div className="space-y-1 text-[11px] text-slate-600">
          <p className="flex items-center gap-1">
            <Clock className="h-3 w-3 shrink-0 text-slate-400" aria-hidden />
            <span className="font-medium text-slate-700">
              {formatTechnicianJobTime(job.scheduledDate)}
            </span>
          </p>
          <p className="flex items-center gap-1">
            <MapPin className="h-3 w-3 shrink-0 text-slate-400" aria-hidden />
            <span className="truncate">{location}</span>
          </p>
        </div>

        <TechnicianJobStatusBadge status={job.status} className="text-[10px]" />
      </div>
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
    <div className="space-y-4">
      <section className="space-y-2.5" aria-label={heroSectionAriaLabel}>
        <h2 className={technicianFieldSectionLabelClass}>{heroSectionLabel}</h2>
        <TechnicianActiveJobHero
          job={heroJob}
          timeState={timeState}
          aiFeaturesEnabled={aiFeaturesEnabled}
          onSelectJob={onSelectJob}
          onJobStatusUpdated={onJobStatusUpdated}
        />
      </section>

      {upNextJobs.length > 0 ? (
        <section className="space-y-2.5" aria-label="Up next jobs">
          <div className="flex items-center justify-between gap-2 px-0.5">
            <h2 className={technicianFieldSectionLabelClass}>Up Next</h2>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold tabular-nums text-slate-600">
              {upNextJobs.length}
            </span>
          </div>

          <div
            key={deckKey}
            className="-mx-1 flex min-h-[7.5rem] snap-x snap-mandatory gap-2.5 overflow-x-auto px-1 pb-1 sm:hidden"
            data-no-pull-refresh
          >
            {upNextJobs.map((job) => (
              <TechnicianUpNextJobCard
                key={job.id}
                job={job}
                isHighlighted={isHighlighted(job)}
                onSelectJob={onSelectJob}
              />
            ))}
          </div>

          <ul
            className="hidden gap-2.5 sm:grid sm:grid-cols-2 lg:grid-cols-1"
            data-no-pull-refresh
          >
            {upNextJobs.map((job) => (
              <li key={job.id} className="min-w-0">
                <TechnicianUpNextJobCard
                  job={job}
                  isHighlighted={isHighlighted(job)}
                  fullWidth
                  onSelectJob={onSelectJob}
                />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
