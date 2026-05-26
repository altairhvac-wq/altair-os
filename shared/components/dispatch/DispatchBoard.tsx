import type { DispatchJob, Technician } from "@/shared/types/dispatch";
import { TechnicianColumn } from "./TechnicianColumn";
import { UnassignedJobsPanel } from "./UnassignedJobsPanel";

type DispatchBoardProps = {
  jobs: DispatchJob[];
  technicians: Technician[];
  technicianFilter: string;
  selectedJobId: string | null;
  onSelectJob: (job: DispatchJob) => void;
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

export function DispatchBoard({
  jobs,
  technicians,
  technicianFilter,
  selectedJobId,
  onSelectJob,
  highlightUnassignedPanel = false,
}: DispatchBoardProps) {
  const unassignedJobs = jobs.filter((job) => !job.technicianId);
  const grouped = groupJobsByTechnician(jobs);

  const visibleTechnicians =
    technicianFilter === "all" || technicianFilter === "unassigned"
      ? technicians
      : technicians.filter((tech) => tech.id === technicianFilter);

  const showUnassignedInline = technicianFilter === "unassigned";
  const showTechnicianColumns = technicianFilter !== "unassigned";

  return (
    <div className="flex min-w-0 max-w-full flex-col gap-2 sm:gap-3">
      {showUnassignedInline ? (
        <UnassignedJobsPanel
          jobs={unassignedJobs}
          selectedJobId={selectedJobId}
          onSelectJob={onSelectJob}
          emphasized={highlightUnassignedPanel}
        />
      ) : null}

      {showTechnicianColumns
        ? visibleTechnicians.map((technician) => (
            <TechnicianColumn
              key={technician.id}
              technician={technician}
              jobs={grouped.get(technician.id) ?? []}
              selectedJobId={selectedJobId}
              onSelectJob={onSelectJob}
            />
          ))
        : null}
    </div>
  );
}
