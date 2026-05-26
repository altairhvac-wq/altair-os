import { Inbox } from "lucide-react";
import type { DispatchJob } from "@/shared/types/dispatch";
import { DispatchJobCard } from "./DispatchJobCard";

type UnassignedJobsPanelProps = {
  jobs: DispatchJob[];
  selectedJobId: string | null;
  onSelectJob: (job: DispatchJob) => void;
  emphasized?: boolean;
};

export function UnassignedJobsPanel({
  jobs,
  selectedJobId,
  onSelectJob,
  emphasized = false,
}: UnassignedJobsPanelProps) {
  return (
    <section
      className={`min-w-0 max-w-full overflow-hidden rounded-xl border bg-amber-50/40 sm:rounded-2xl ${
        emphasized
          ? "border-amber-400 bg-amber-50/70 shadow-md ring-2 ring-amber-400/25"
          : "border-amber-200/80"
      }`}
    >
      <div className="flex min-w-0 flex-col sm:flex-row sm:items-stretch">
        <header className="flex shrink-0 items-center gap-2 border-b border-amber-200/80 bg-white px-2.5 py-2 sm:gap-2.5 sm:w-44 sm:flex-col sm:items-start sm:justify-center sm:border-b-0 sm:border-r sm:px-3 sm:py-2.5 lg:w-48">
          <div className="flex items-center gap-2 sm:w-full sm:gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700 sm:h-9 sm:w-9 sm:rounded-xl">
              <Inbox className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1 sm:w-full">
              <h3 className="text-sm font-bold text-slate-900">Unassigned</h3>
              <p className="hidden text-[11px] text-slate-500 sm:block">
                Needs assignment
              </p>
            </div>
          </div>
          <span className="ml-auto rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-800 sm:ml-0">
            {jobs.length}
          </span>
        </header>

        <div className="flex min-h-[4.5rem] min-w-0 flex-1 gap-1.5 overflow-x-auto p-1.5 sm:min-h-[5.5rem] sm:gap-2 sm:p-2">
          {jobs.length === 0 ? (
            <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-amber-200 bg-white/70 px-3 py-3 text-center sm:rounded-xl sm:px-4 sm:py-4">
              <p className="text-[11px] font-medium text-slate-600">
                No unassigned jobs match your filters
              </p>
            </div>
          ) : (
            jobs.map((job) => (
              <DispatchJobCard
                key={job.id}
                job={job}
                compact
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
