import { memo } from "react";
import type { DispatchJob, Technician } from "@/shared/types/dispatch";
import { DispatchJobCard } from "./DispatchJobCard";

type TechnicianColumnProps = {
  technician: Technician;
  jobs: DispatchJob[];
  selectedJobId: string | null;
  pendingJobId?: string | null;
  nextJobTime?: string | null;
  onSelectJob: (job: DispatchJob) => void;
};

const statusDot: Record<Technician["status"], string> = {
  available: "bg-emerald-500",
  on_job: "bg-amber-500",
  off_duty: "bg-slate-400",
};

const statusLabel: Record<Technician["status"], string> = {
  available: "Available",
  on_job: "On job",
  off_duty: "Off duty",
};

export const TechnicianColumn = memo(function TechnicianColumn({
  technician,
  jobs,
  selectedJobId,
  pendingJobId = null,
  nextJobTime = null,
  onSelectJob,
}: TechnicianColumnProps) {
  return (
    <section className="min-w-0 max-w-full overflow-hidden rounded-xl border border-slate-200 bg-slate-50/80 sm:rounded-2xl">
      <div className="flex min-w-0 flex-col sm:flex-row sm:items-stretch">
        <header className="flex shrink-0 items-center gap-2 border-b border-slate-200 bg-white px-2.5 py-2 sm:gap-2.5 sm:w-44 sm:flex-col sm:items-start sm:justify-center sm:border-b-0 sm:border-r sm:px-3 sm:py-2.5 lg:w-48">
          <div className="flex items-center gap-2 sm:w-full sm:gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-slate-800 to-slate-600 text-xs font-bold text-white shadow-sm sm:h-9 sm:w-9 sm:rounded-xl">
              {technician.initials}
            </div>
            <div className="min-w-0 flex-1 sm:w-full">
              <h3 className="truncate text-sm font-bold text-slate-900">
                {technician.name}
              </h3>
              <p className="truncate text-[11px] text-slate-500">
                {technician.role}
              </p>
            </div>
          </div>
          <div className="ml-auto flex items-center gap-2 sm:ml-0 sm:w-full sm:justify-between">
            <div className="flex items-center gap-1.5">
              <span
                className={`h-1.5 w-1.5 rounded-full ${statusDot[technician.status]}`}
              />
              <span className="text-[11px] font-medium text-slate-600">
                {statusLabel[technician.status]}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              {nextJobTime ? (
                <span className="hidden text-[10px] font-medium text-slate-500 sm:inline">
                  Next {nextJobTime}
                </span>
              ) : null}
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                {jobs.length}
              </span>
            </div>
          </div>
        </header>

        <div className="flex min-h-[4.5rem] min-w-0 flex-1 snap-x snap-mandatory gap-1.5 overflow-x-auto p-1.5 sm:min-h-[5.5rem] sm:gap-2 sm:p-2" data-no-pull-refresh>
          {jobs.length === 0 ? (
            <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-slate-200 bg-white/60 px-3 py-3 text-center sm:rounded-xl sm:px-4 sm:py-4">
              <p className="text-[11px] font-medium text-slate-500">
                No assigned jobs
              </p>
            </div>
          ) : (
            jobs.map((job) => (
              <DispatchJobCard
                key={job.id}
                job={job}
                compact
                hideTechnician
                isSelected={selectedJobId === job.id}
                isAssigning={pendingJobId === job.id}
                onSelect={onSelectJob}
              />
            ))
          )}
        </div>
      </div>
    </section>
  );
});
