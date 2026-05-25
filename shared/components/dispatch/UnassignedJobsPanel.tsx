import { Inbox } from "lucide-react";
import type { DispatchJob } from "@/shared/types/dispatch";
import { DispatchJobCard } from "./DispatchJobCard";

type UnassignedJobsPanelProps = {
  jobs: DispatchJob[];
  selectedJobId: string | null;
  onSelectJob: (job: DispatchJob) => void;
};

export function UnassignedJobsPanel({
  jobs,
  selectedJobId,
  onSelectJob,
}: UnassignedJobsPanelProps) {
  return (
    <section className="rounded-2xl border border-amber-200/80 bg-amber-50/40">
      <div className="flex flex-col sm:flex-row sm:items-stretch">
        <header className="flex shrink-0 items-center gap-2.5 border-b border-amber-200/80 bg-white px-3 py-2.5 sm:w-44 sm:flex-col sm:items-start sm:justify-center sm:border-b-0 sm:border-r lg:w-48">
          <div className="flex items-center gap-2.5 sm:w-full">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
              <Inbox className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1 sm:w-full">
              <h3 className="text-sm font-bold text-slate-900">Unassigned</h3>
              <p className="text-[11px] text-slate-500">Needs assignment</p>
            </div>
          </div>
          <span className="ml-auto rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-800 sm:ml-0">
            {jobs.length}
          </span>
        </header>

        <div className="flex min-h-[5.5rem] flex-1 gap-2 overflow-x-auto p-2">
          {jobs.length === 0 ? (
            <div className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-amber-200 bg-white/70 px-4 py-4 text-center">
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
