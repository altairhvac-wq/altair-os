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
  onSelectJob: (job: TechnicianJob) => void;
};

export function TechnicianJobList({
  jobs,
  selectedJobId,
  timeState,
  onSelectJob,
}: TechnicianJobListProps) {
  if (jobs.length === 0) {
    return null;
  }

  return (
    <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1" data-no-pull-refresh>
      {jobs.map((job) => {
        const isLive = isLiveTechnicianJob(job, timeState);
        const isHighlighted =
          selectedJobId === job.id || (selectedJobId === null && isLive);

        return (
          <li key={job.id} className="min-w-0">
            <DispatchJobCard
              job={technicianJobToDispatchJob(job)}
              compact={false}
              hideTechnician
              isSelected={isHighlighted}
              className="w-full"
              onSelect={() => onSelectJob(job)}
            />
          </li>
        );
      })}
    </ul>
  );
}
