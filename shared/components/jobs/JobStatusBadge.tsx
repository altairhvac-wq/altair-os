import { formatJobStatus, type JobStatus } from "@/shared/types/job";

type JobStatusBadgeProps = {
  status: JobStatus;
  className?: string;
};

const statusStyles: Record<JobStatus, string> = {
  scheduled: "bg-blue-50 text-blue-700 ring-blue-600/20",
  dispatched: "bg-violet-50 text-violet-700 ring-violet-600/20",
  in_progress: "bg-amber-50 text-amber-700 ring-amber-600/20",
  completed: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  cancelled: "bg-slate-100 text-slate-600 ring-slate-500/20",
};

export function JobStatusBadge({ status, className = "" }: JobStatusBadgeProps) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ring-1 ring-inset ${statusStyles[status]} ${className}`}
    >
      {formatJobStatus(status)}
    </span>
  );
}
