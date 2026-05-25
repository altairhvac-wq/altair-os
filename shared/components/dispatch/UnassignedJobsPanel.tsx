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
    <section className="flex w-full shrink-0 flex-col rounded-2xl border border-amber-200/80 bg-amber-50/40 lg:w-72 xl:w-80">
      <header className="border-b border-amber-200/80 bg-white px-4 py-3.5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
            <Inbox className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-bold text-slate-900">Unassigned Jobs</h3>
            <p className="text-xs text-slate-500">Needs technician assignment</p>
          </div>
          <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-800">
            {jobs.length}
          </span>
        </div>
      </header>

      <div className="flex min-h-[8rem] flex-1 flex-col gap-3 overflow-y-auto p-3">
        {jobs.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-amber-200 bg-white/70 px-4 py-8 text-center">
            <p className="text-xs font-medium text-slate-600">All jobs assigned</p>
            <p className="mt-1 text-[11px] text-slate-400">
              Unassigned work orders will queue here
            </p>
          </div>
        ) : (
          jobs.map((job) => (
            <DispatchJobCard
              key={job.id}
              job={job}
              isSelected={selectedJobId === job.id}
              onSelect={onSelectJob}
            />
          ))
        )}
      </div>
    </section>
  );
}
