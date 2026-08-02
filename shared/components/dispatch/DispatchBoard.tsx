"use client";

import { memo, useMemo } from "react";
import type { DispatchJob, Technician } from "@/shared/types/dispatch";
import { DispatchMapPanel } from "./DispatchMapPanel";
import { DispatchTimeGrid } from "./DispatchTimeGrid";
import { UnassignedJobsPanel } from "./UnassignedJobsPanel";

type DispatchBoardProps = {
  jobs: DispatchJob[];
  technicians: Technician[];
  technicianFilter: string;
  selectedJobId: string | null;
  pendingJobId: string | null;
  onSelectJob: (job: DispatchJob) => void;
  highlightUnassignedPanel?: boolean;
  overloadedTechnicianIds?: string[];
};

function groupJobsByTechnician(jobs: DispatchJob[]): Map<string, DispatchJob[]> {
  const grouped = new Map<string, DispatchJob[]>();

  for (const job of jobs) {
    if (!job.technicianId) continue;
    const existing = grouped.get(job.technicianId) ?? [];
    existing.push(job);
    grouped.set(job.technicianId, existing);
  }

  return grouped;
}

function sortTechniciansByName(technicians: Technician[]): Technician[] {
  return [...technicians].sort((a, b) => a.name.localeCompare(b.name));
}

export const DispatchBoard = memo(function DispatchBoard({
  jobs,
  technicians,
  technicianFilter,
  selectedJobId,
  pendingJobId,
  onSelectJob,
  highlightUnassignedPanel = false,
  overloadedTechnicianIds = [],
}: DispatchBoardProps) {
  const unassignedJobs = useMemo(
    () => jobs.filter((job) => !job.technicianId),
    [jobs],
  );
  const grouped = useMemo(() => groupJobsByTechnician(jobs), [jobs]);

  const sortedTechnicians = useMemo(
    () => sortTechniciansByName(technicians),
    [technicians],
  );

  const visibleTechnicians = useMemo(() => {
    if (technicianFilter === "all" || technicianFilter === "unassigned") {
      return sortedTechnicians;
    }
    return sortedTechnicians.filter((tech) => tech.id === technicianFilter);
  }, [sortedTechnicians, technicianFilter]);

  const showUnassignedSidebar =
    technicianFilter === "unassigned" || technicianFilter === "all";
  const showTechnicianColumns = technicianFilter !== "unassigned";

  return (
    <div className="flex min-h-0 min-w-0 w-full max-w-full flex-1 flex-col gap-2 overflow-hidden max-md:overflow-visible md:h-full lg:flex-row lg:items-stretch lg:gap-2.5">
      {showUnassignedSidebar ? (
        <UnassignedJobsPanel
          jobs={unassignedJobs}
          selectedJobId={selectedJobId}
          pendingJobId={pendingJobId}
          onSelectJob={onSelectJob}
          emphasized={highlightUnassignedPanel}
          expanded={!showTechnicianColumns}
        />
      ) : null}

      <div className="flex min-h-0 min-w-0 w-full flex-1 flex-col gap-2.5 overflow-hidden max-md:overflow-visible">
        <DispatchMapPanel
          jobs={jobs}
          selectedJobId={selectedJobId}
          onSelectJob={onSelectJob}
        />

        {showTechnicianColumns ? (
          <div className="flex min-h-[16rem] min-w-0 flex-1 flex-col overflow-hidden max-md:min-h-[20rem] md:min-h-0">
            <DispatchTimeGrid
              technicians={visibleTechnicians}
              jobsByTechnician={grouped}
              selectedJobId={selectedJobId}
              pendingJobId={pendingJobId}
              overloadedTechnicianIds={overloadedTechnicianIds}
              onSelectJob={onSelectJob}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
});
