import { ChevronRight } from "lucide-react";
import {
  formatScheduledTime,
  type Job,
} from "@/shared/types/job";
import { JobStatusBadge } from "./JobStatusBadge";

type JobsTodayCardListProps = {
  jobs: Job[];
  onSelect: (job: Job) => void;
};

export function JobsTodayCardList({ jobs, onSelect }: JobsTodayCardListProps) {
  return (
    <ul className="divide-y divide-slate-100">
      {jobs.map((job) => (
        <li key={job.id}>
          <button
            type="button"
            onClick={() => onSelect(job)}
            className="flex w-full min-w-0 items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/20"
          >
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="truncate text-sm font-bold text-slate-900">
                  {job.customerName}
                </p>
                <JobStatusBadge status={job.status} />
              </div>
              <p className="mt-0.5 truncate text-sm text-slate-600">
                {job.jobType}
              </p>
              <p className="mt-1 truncate text-xs text-slate-500">
                {job.serviceAddress}
                {job.city || job.state
                  ? ` · ${[job.city, job.state].filter(Boolean).join(", ")}`
                  : null}
              </p>
              {job.assignedTechnician ? (
                <p className="mt-1 truncate text-xs text-slate-400">
                  {job.assignedTechnician}
                </p>
              ) : (
                <p className="mt-1 text-xs text-slate-400">Unassigned</p>
              )}
            </div>

            <div className="flex shrink-0 items-center gap-2 pt-0.5">
              <div className="text-right">
                <p className="text-sm font-semibold text-slate-700">
                  {formatScheduledTime(job.scheduledDate)}
                </p>
                <p className="text-xs text-slate-400">{job.jobNumber}</p>
              </div>
              <ChevronRight className="h-4 w-4 text-slate-300" />
            </div>
          </button>
        </li>
      ))}
    </ul>
  );
}
