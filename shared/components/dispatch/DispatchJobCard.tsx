import { Calendar, Clock, MapPin, User } from "lucide-react";
import {
  formatDispatchDate,
  formatDispatchTime,
  type DispatchJob,
} from "@/shared/types/dispatch";
import { DispatchPriorityBadge } from "./DispatchPriorityBadge";
import { DispatchStatusBadge } from "./DispatchStatusBadge";

type DispatchJobCardProps = {
  job: DispatchJob;
  technicianName?: string;
  isSelected?: boolean;
  onSelect: (job: DispatchJob) => void;
};

export function DispatchJobCard({
  job,
  technicianName,
  isSelected = false,
  onSelect,
}: DispatchJobCardProps) {
  const location = `${job.city}, ${job.state}`;

  return (
    <button
      type="button"
      onClick={() => onSelect(job)}
      className={`w-full rounded-xl border p-3.5 text-left transition-all ${
        isSelected
          ? "border-cyan-500 bg-cyan-50/60 shadow-md ring-2 ring-cyan-500/20"
          : "border-slate-200 bg-white shadow-sm hover:border-slate-300 hover:shadow-md"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            {job.jobNumber}
          </p>
          <h4 className="mt-0.5 truncate text-sm font-bold text-slate-900">
            {job.customerName}
          </h4>
          <p className="mt-0.5 truncate text-xs text-slate-500">{job.jobType}</p>
        </div>
        <DispatchPriorityBadge priority={job.priority} />
      </div>

      <div className="mt-3 space-y-1.5 text-xs text-slate-600">
        <div className="flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5 shrink-0 text-slate-400" />
          <span className="font-medium text-slate-700">
            {formatDispatchTime(job.scheduledDate)}
          </span>
          <span className="text-slate-400">·</span>
          <Calendar className="h-3.5 w-3.5 shrink-0 text-slate-400" />
          <span>{formatDispatchDate(job.scheduledDate)}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-400" />
          <span className="truncate">
            {job.serviceAddress}, {location}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <User className="h-3.5 w-3.5 shrink-0 text-slate-400" />
          <span>{technicianName ?? "Unassigned"}</span>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between gap-2 border-t border-slate-100 pt-2.5">
        <DispatchStatusBadge status={job.status} />
        {job.priority === "urgent" ? (
          <span className="text-[10px] font-bold uppercase tracking-wide text-red-600">
            Urgent
          </span>
        ) : null}
      </div>
    </button>
  );
}
