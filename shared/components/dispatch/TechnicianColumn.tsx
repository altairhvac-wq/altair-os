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
    <section className="flex w-full shrink-0 flex-col rounded-2xl border border-slate-200 bg-slate-50/80 lg:w-72 xl:w-80">
      <header className="border-b border-slate-200 bg-white px-4 py-3.5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-slate-800 to-slate-600 text-sm font-bold text-white shadow-sm">
            {technician.initials}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-sm font-bold text-slate-900">
              {technician.name}
            </h3>
            <p className="truncate text-xs text-slate-500">{technician.role}</p>
          </div>
        </div>
        <div className="mt-2.5 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <span
              className={`h-2 w-2 rounded-full ${statusDot[technician.status]}`}
            />
            <span className="text-xs font-medium text-slate-600">
              {statusLabel[technician.status]}
            </span>
          </div>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
            {jobs.length} {jobs.length === 1 ? "job" : "jobs"}
          </span>
        </div>
      </header>

      <div className="flex min-h-[8rem] flex-1 flex-col gap-3 overflow-y-auto p-3">
        {jobs.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-white/60 px-4 py-8 text-center">
            <p className="text-xs font-medium text-slate-500">No assigned jobs</p>
            <p className="mt-1 text-[11px] text-slate-400">
              Jobs assigned to this tech appear here
            </p>
          </div>
        ) : (
          jobs.map((job) => (
            <DispatchJobCard
              key={job.id}
              job={job}
              technicianName={technician.name}
              isSelected={selectedJobId === job.id}
              onSelect={onSelectJob}
            />
          ))
        )}
      </div>
    </section>
  );
}
