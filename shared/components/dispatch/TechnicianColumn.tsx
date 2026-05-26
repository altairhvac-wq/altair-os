import type { DispatchJob, Technician } from "@/shared/types/dispatch";
import { DispatchJobCard } from "./DispatchJobCard";

type TechnicianColumnProps = {
  technician: Technician;
  jobs: DispatchJob[];
  selectedJobId: string | null;
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

export function TechnicianColumn({
  technician,
  jobs,
  selectedJobId,
  onSelectJob,
}: TechnicianColumnProps) {
  return (
    <section className="min-w-0 max-w-full overflow-hidden rounded-2xl border border-slate-200 bg-slate-50/80">
      <div className="flex min-w-0 flex-col sm:flex-row sm:items-stretch">
        <header className="flex shrink-0 items-center gap-2.5 border-b border-slate-200 bg-white px-3 py-2.5 sm:w-44 sm:flex-col sm:items-start sm:justify-center sm:border-b-0 sm:border-r lg:w-48">
          <div className="flex items-center gap-2.5 sm:w-full">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-slate-800 to-slate-600 text-xs font-bold text-white shadow-sm">
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
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
              {jobs.length}
            </span>
          </div>
        </header>

        <div className="flex min-h-[5.5rem] min-w-0 flex-1 gap-2 overflow-x-auto p-2">
          {jobs.length === 0 ? (
            <div className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-slate-200 bg-white/60 px-4 py-4 text-center">
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
                onSelect={onSelectJob}
              />
            ))
          )}
        </div>
      </div>
    </section>
  );
}
