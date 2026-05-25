import { ChevronRight, Clock, MapPin } from "lucide-react";
import {
  formatJobPriority,
  formatTechnicianJobAddress,
  formatTechnicianJobTime,
  getPriorityStyles,
  type TechnicianJob,
} from "@/shared/types/technician";
import { TechnicianJobStatusBadge } from "./TechnicianJobStatusBadge";

type UpcomingJobsListProps = {
  jobs: TechnicianJob[];
  onSelectJob: (job: TechnicianJob) => void;
};

export function UpcomingJobsList({ jobs, onSelectJob }: UpcomingJobsListProps) {
  if (jobs.length === 0) {
    return null;
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-4 py-3">
        <h2 className="text-sm font-bold text-slate-900">Up Next</h2>
        <p className="text-xs text-slate-500">
          {jobs.length} job{jobs.length === 1 ? "" : "s"} remaining today
        </p>
      </div>

      <ul className="divide-y divide-slate-100">
        {jobs.map((job, index) => (
          <li key={job.id}>
            <button
              type="button"
              onClick={() => onSelectJob(job)}
              className="flex w-full items-start gap-3 px-4 py-4 text-left transition-colors hover:bg-slate-50 active:bg-slate-100"
            >
              <div className="flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-xl bg-slate-100 text-xs font-bold text-slate-600">
                <span className="text-[10px] font-semibold uppercase text-slate-400">
                  {index === 0 ? "Next" : `#${index + 1}`}
                </span>
                <Clock className="h-3.5 w-3.5" />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-slate-900">
                      {job.customerName}
                    </p>
                    <p className="truncate text-xs text-slate-500">
                      {job.jobType} · {job.jobNumber}
                    </p>
                  </div>
                  <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                </div>

                <div className="mt-2 flex items-start gap-1.5">
                  <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
                  <p className="line-clamp-2 text-xs text-slate-600">
                    {formatTechnicianJobAddress(job)}
                  </p>
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className="text-xs font-semibold text-slate-700">
                    {formatTechnicianJobTime(job.scheduledDate)}
                  </span>
                  <TechnicianJobStatusBadge status={job.status} />
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset ${getPriorityStyles(job.priority)}`}
                  >
                    {formatJobPriority(job.priority)}
                  </span>
                </div>
              </div>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
