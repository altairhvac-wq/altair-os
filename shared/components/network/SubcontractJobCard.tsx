import { Calendar, DollarSign, MapPin, User } from "lucide-react";
import { formatCurrency, formatDate } from "@/shared/types/customer";
import {
  formatSubcontractJobStatus,
  type SubcontractJob,
} from "@/shared/types/network";

type SubcontractJobCardProps = {
  job: SubcontractJob;
  compact?: boolean;
};

const statusStyles: Record<SubcontractJob["status"], string> = {
  open: "bg-blue-50 text-blue-700 ring-blue-600/20",
  pending: "bg-amber-50 text-amber-700 ring-amber-600/20",
  accepted: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  in_progress: "bg-violet-50 text-violet-700 ring-violet-600/20",
  completed: "bg-slate-100 text-slate-700 ring-slate-500/20",
  declined: "bg-rose-50 text-rose-700 ring-rose-600/20",
};

function JobStatusBadge({ status }: { status: SubcontractJob["status"] }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${statusStyles[status]}`}
    >
      {formatSubcontractJobStatus(status)}
    </span>
  );
}

export function SubcontractJobCard({
  job,
  compact = false,
}: SubcontractJobCardProps) {
  const location = `${job.city}, ${job.state}`;
  const amount =
    job.direction === "sent"
      ? job.payoutAmount
      : job.direction === "received"
        ? job.earnedAmount
        : job.budget;

  return (
    <div
      className={
        compact
          ? "space-y-4"
          : "rounded-xl border border-slate-100 bg-white p-4"
      }
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {job.jobNumber}
          </p>
          <h3 className="mt-1 truncate text-base font-bold text-slate-900">
            {job.title}
          </h3>
          <p className="mt-0.5 truncate text-sm text-slate-500">
            {job.tradeType}
          </p>
        </div>
        <JobStatusBadge status={job.status} />
      </div>

      <div className="space-y-2 text-sm text-slate-600">
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 shrink-0 text-slate-400" />
          <span className="truncate">
            {job.serviceAddress}, {location}
          </span>
        </div>

        {job.partnerCompanyName || job.postedBy ? (
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 shrink-0 text-slate-400" />
            <span className="truncate">
              {job.partnerCompanyName ?? job.postedBy}
            </span>
          </div>
        ) : null}

        {job.scheduledDate ? (
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 shrink-0 text-slate-400" />
            <span>{formatDate(job.scheduledDate)}</span>
          </div>
        ) : null}

        {amount != null ? (
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 shrink-0 text-slate-400" />
            <span className="font-semibold text-slate-900">
              {formatCurrency(amount)}
            </span>
          </div>
        ) : null}
      </div>

      {!compact && job.description ? (
        <p className="border-t border-slate-100 pt-3 text-sm leading-relaxed text-slate-600">
          {job.description}
        </p>
      ) : null}
    </div>
  );
}
