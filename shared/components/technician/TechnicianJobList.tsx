"use client";

import { DispatchJobCard } from "@/shared/components/dispatch/DispatchJobCard";
import {
  isLiveTechnicianJob,
  technicianJobToDispatchJob,
} from "@/shared/lib/technician-dispatch-job";
import type { TechnicianJob } from "@/shared/types/technician";
import type { TechnicianTimeStateSnapshot } from "@/shared/types/time-entry";

type TechnicianJobListProps = {
  jobs: TechnicianJob[];
  selectedJobId: string | null;
  timeState: TechnicianTimeStateSnapshot;
  /** Resets the mobile carousel when the schedule day changes. */
  deckKey?: string;
  onSelectJob: (job: TechnicianJob) => void;
};

function TechnicianJobListCard({
  job,
  compact,
  isHighlighted,
  onSelectJob,
}: {
  job: TechnicianJob;
  compact: boolean;
  isHighlighted: boolean;
  onSelectJob: (job: TechnicianJob) => void;
}) {
  return (
    <DispatchJobCard
      job={technicianJobToDispatchJob(job)}
      compact={compact}
      hideTechnician
      isSelected={isHighlighted}
      className={compact ? undefined : "w-full"}
      onSelect={() => onSelectJob(job)}
    />
  );
}

export function TechnicianJobList({
  jobs,
  selectedJobId,
  timeState,
  deckKey,
  onSelectJob,
}: TechnicianJobListProps) {
  if (jobs.length === 0) {
    return null;
  }

  const multiJobDeck = jobs.length > 1;

  function isHighlighted(job: TechnicianJob): boolean {
    const isLive = isLiveTechnicianJob(job, timeState);
    return selectedJobId === job.id || (selectedJobId === null && isLive);
  }

  if (!multiJobDeck) {
    return (
      <section className="min-w-0 max-w-full" data-no-pull-refresh>
        <TechnicianJobListCard
          job={jobs[0]}
          compact={false}
          isHighlighted={isHighlighted(jobs[0])}
          onSelectJob={onSelectJob}
        />
      </section>
    );
  }

  return (
    <section
      className="min-w-0 max-w-full overflow-hidden rounded-xl ring-1 ring-slate-200/60"
      aria-label={`${jobs.length} assigned jobs`}
    >
      <header className="flex items-center justify-between gap-2 border-b border-slate-200/80 bg-white px-2.5 py-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-900">Your jobs</p>
          <p className="text-[11px] font-medium text-slate-500 sm:hidden">
            Swipe to view all {jobs.length} jobs
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-slate-100/90 px-2 py-0.5 text-[11px] font-semibold tabular-nums text-slate-700">
          {jobs.length}
        </span>
      </header>

      <div
        key={deckKey}
        className="flex min-h-[4.25rem] min-w-0 snap-x snap-mandatory gap-1.5 overflow-x-auto bg-white p-1.5 sm:hidden"
        data-no-pull-refresh
      >
        {jobs.map((job) => (
          <TechnicianJobListCard
            key={job.id}
            job={job}
            compact
            isHighlighted={isHighlighted(job)}
            onSelectJob={onSelectJob}
          />
        ))}
      </div>

      <ul
        className="hidden gap-2 bg-white p-2 sm:grid sm:grid-cols-2 lg:grid-cols-1"
        data-no-pull-refresh
      >
        {jobs.map((job) => (
          <li key={job.id} className="min-w-0">
            <TechnicianJobListCard
              job={job}
              compact={false}
              isHighlighted={isHighlighted(job)}
              onSelectJob={onSelectJob}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}
