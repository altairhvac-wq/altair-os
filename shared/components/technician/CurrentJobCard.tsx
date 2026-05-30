import { ChevronRight, Clock, MapPin, User } from "lucide-react";
import {
  formatJobPriority,
  formatTechnicianJobAddress,
  formatTechnicianJobTime,
  getPriorityStyles,
  type TechnicianJob,
  type TechnicianQuickAction,
} from "@/shared/types/technician";
import { TechnicianJobStatusBadge } from "./TechnicianJobStatusBadge";
import { TechnicianQuickActions } from "./TechnicianQuickActions";

type CurrentJobCardProps = {
  job: TechnicianJob;
  onViewDetails: (job: TechnicianJob) => void;
  onQuickAction: (action: TechnicianQuickAction, job: TechnicianJob) => void;
};

export function CurrentJobCard({
  job,
  onViewDetails,
  onQuickAction,
}: CurrentJobCardProps) {
  return (
    <section className="rounded-2xl border border-slate-200/90 border-l-[3px] border-l-cyan-600 bg-white shadow-sm">
      <div className="border-b border-slate-100 p-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Current Job
            </p>
            <h2 className="mt-1 text-xl font-semibold text-slate-900">
              {job.jobNumber}
            </h2>
            <p className="mt-0.5 text-sm font-medium text-slate-600">
              {job.jobType}
            </p>
          </div>

          <button
            type="button"
            onClick={() => onViewDetails(job)}
            className="inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50"
          >
            Details
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <TechnicianJobStatusBadge status={job.status} />
          <span
            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${getPriorityStyles(job.priority)}`}
          >
            {formatJobPriority(job.priority)} priority
          </span>
        </div>
      </div>

      <div className="space-y-2.5 p-3">
        <div className="flex items-start gap-3">
          <User className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
          <div>
            <p className="text-sm font-medium text-slate-900">
              {job.customerName}
            </p>
            <p className="text-xs text-slate-500">{job.customerPhone}</p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
          <p className="text-sm text-slate-700">
            {formatTechnicianJobAddress(job)}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Clock className="h-4 w-4 shrink-0 text-slate-400" />
          <p className="text-sm text-slate-600">
            Scheduled {formatTechnicianJobTime(job.scheduledDate)}
          </p>
        </div>
      </div>

      <div className="border-t border-slate-100 p-4">
        <p className="mb-3 text-xs font-medium uppercase tracking-wide text-slate-400">
          Quick Actions
        </p>
        <TechnicianQuickActions job={job} onAction={onQuickAction} />
      </div>
    </section>
  );
}
