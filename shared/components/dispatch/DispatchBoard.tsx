"use client";

import { memo, useMemo } from "react";
import type { DispatchJob, Technician } from "@/shared/types/dispatch";
import { formatDispatchTime } from "@/shared/types/dispatch";
import { TechnicianColumn } from "./TechnicianColumn";
import { UnassignedJobsPanel } from "./UnassignedJobsPanel";

type DispatchBoardProps = {
  jobs: DispatchJob[];
  technicians: Technician[];
  technicianFilter: string;
  selectedJobId: string | null;
  pendingJobId: string | null;
  hideEmptyTechnicianLanes: boolean;
  showAllTechnicians: boolean;
  onSelectJob: (job: DispatchJob) => void;
  onToggleShowAllTechnicians: () => void;
  highlightUnassignedPanel?: boolean;
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

function sortTechniciansByWorkload(
  technicians: Technician[],
  grouped: Map<string, DispatchJob[]>,
): Technician[] {
  return [...technicians].sort((a, b) => {
    const countDiff =
      (grouped.get(b.id)?.length ?? 0) - (grouped.get(a.id)?.length ?? 0);
    if (countDiff !== 0) {
      return countDiff;
    }
    return a.name.localeCompare(b.name);
  });
}

export const DispatchBoard = memo(function DispatchBoard({
  jobs,
  technicians,
  technicianFilter,
  selectedJobId,
  pendingJobId,
  hideEmptyTechnicianLanes,
  showAllTechnicians,
  onSelectJob,
  onToggleShowAllTechnicians,
  highlightUnassignedPanel = false,
}: DispatchBoardProps) {
  const unassignedJobs = useMemo(
    () => jobs.filter((job) => !job.technicianId),
    [jobs],
  );
  const grouped = useMemo(() => groupJobsByTechnician(jobs), [jobs]);

  const sortedTechnicians = useMemo(
    () => sortTechniciansByWorkload(technicians, grouped),
    [technicians, grouped],
  );

  const visibleTechnicians = useMemo(() => {
    let list =
      technicianFilter === "all" || technicianFilter === "unassigned"
        ? sortedTechnicians
        : sortedTechnicians.filter((tech) => tech.id === technicianFilter);

    if (
      hideEmptyTechnicianLanes &&
      !showAllTechnicians &&
      technicianFilter === "all"
    ) {
      list = list.filter((tech) => (grouped.get(tech.id)?.length ?? 0) > 0);
    }

    return list;
  }, [
    grouped,
    hideEmptyTechnicianLanes,
    showAllTechnicians,
    sortedTechnicians,
    technicianFilter,
  ]);

  const hiddenEmptyTechnicianCount = useMemo(() => {
    if (!hideEmptyTechnicianLanes || showAllTechnicians || technicianFilter !== "all") {
      return 0;
    }

    return sortedTechnicians.filter(
      (tech) => (grouped.get(tech.id)?.length ?? 0) === 0,
    ).length;
  }, [
    grouped,
    hideEmptyTechnicianLanes,
    showAllTechnicians,
    sortedTechnicians,
    technicianFilter,
  ]);

  const showUnassignedInline =
    technicianFilter === "unassigned" ||
    (technicianFilter === "all" && unassignedJobs.length > 0);
  const showTechnicianColumns = technicianFilter !== "unassigned";

  return (
    <div className="flex min-w-0 max-w-full flex-col gap-2 sm:gap-3">
      {showUnassignedInline ? (
        <UnassignedJobsPanel
          jobs={unassignedJobs}
          selectedJobId={selectedJobId}
          pendingJobId={pendingJobId}
          onSelectJob={onSelectJob}
          emphasized={highlightUnassignedPanel}
        />
      ) : null}

      {hiddenEmptyTechnicianCount > 0 ? (
        <button
          type="button"
          onClick={onToggleShowAllTechnicians}
          className="self-start rounded-lg border border-dashed border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-600 transition-colors hover:border-slate-300 hover:bg-slate-50 sm:text-xs"
        >
          Show {hiddenEmptyTechnicianCount} technician
          {hiddenEmptyTechnicianCount === 1 ? "" : "s"} with no jobs today
        </button>
      ) : showAllTechnicians && hideEmptyTechnicianLanes && technicianFilter === "all" ? (
        <button
          type="button"
          onClick={onToggleShowAllTechnicians}
          className="self-start rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-600 transition-colors hover:bg-slate-50 sm:text-xs"
        >
          Hide empty technician lanes
        </button>
      ) : null}

      {showTechnicianColumns
        ? visibleTechnicians.map((technician) => {
            const techJobs = grouped.get(technician.id) ?? [];
            const nextJob = techJobs[0];

            return (
              <TechnicianColumn
                key={technician.id}
                technician={technician}
                jobs={techJobs}
                selectedJobId={selectedJobId}
                pendingJobId={pendingJobId}
                nextJobTime={
                  nextJob ? formatDispatchTime(nextJob.scheduledDate) : null
                }
                onSelectJob={onSelectJob}
              />
            );
          })
        : null}
    </div>
  );
});
