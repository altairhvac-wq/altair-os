import { memo } from "react";
import { Calendar, Clock, Loader2, MapPin, User } from "lucide-react";
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
  isAssigning?: boolean;
  compact?: boolean;
  hideTechnician?: boolean;
  className?: string;
  onSelect: (job: DispatchJob) => void;
};

export const DispatchJobCard = memo(function DispatchJobCard({
  job,
  technicianName,
  isSelected = false,
  isAssigning = false,
  compact = false,
  hideTechnician = false,
  className = "",
  onSelect,
}: DispatchJobCardProps) {
  const location = `${job.city}, ${job.state}`;

  return (
    <button
      type="button"
      onClick={() => onSelect(job)}
      disabled={isAssigning}
      aria-busy={isAssigning}
      className={`snap-start rounded-xl border text-left transition-all ${
        compact ? "w-[11.5rem] shrink-0 p-2 sm:w-52 sm:p-2.5" : "w-full p-3.5"
      } ${
        isAssigning
          ? "border-cyan-300 bg-cyan-50/40 opacity-80"
          : isSelected
            ? "border-cyan-500 bg-cyan-50/60 shadow-md ring-2 ring-cyan-500/20"
            : "border-slate-200 bg-white shadow-sm hover:border-slate-300 hover:shadow-md"
      } ${className}`}
    >
      <div className="flex items-start justify-between gap-1.5">
        <div className="min-w-0 flex-1">
          <p
            className={`font-semibold uppercase tracking-wide text-slate-500 ${
              compact ? "text-[10px]" : "text-[11px]"
            }`}
          >
            {job.jobNumber}
          </p>
          <h4
            className={`truncate font-bold text-slate-900 ${
              compact ? "text-xs" : "mt-0.5 text-sm"
            }`}
          >
            {job.customerName}
          </h4>
          {!compact ? (
            <p className="mt-0.5 truncate text-xs text-slate-500">{job.jobType}</p>
          ) : (
            <p className="truncate text-[11px] text-slate-500">{job.jobType}</p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {isAssigning ? (
            <Loader2
              className="h-3.5 w-3.5 animate-spin text-cyan-600"
              aria-hidden="true"
            />
          ) : null}
          <DispatchPriorityBadge
            priority={job.priority}
            className={compact ? "px-1.5 py-0 text-[10px]" : ""}
          />
        </div>
      </div>

      <div
        className={`text-slate-600 ${
          compact
            ? "mt-1 space-y-0.5 text-[11px] sm:mt-1.5 sm:space-y-1"
            : "mt-3 space-y-1.5 text-xs"
        }`}
      >
        <div className="flex items-center gap-1">
          <Clock
            className={`shrink-0 text-slate-400 ${compact ? "h-3 w-3" : "h-3.5 w-3.5"}`}
          />
          <span className="font-medium text-slate-700">
            {formatDispatchTime(job.scheduledDate)}
          </span>
          <span className="text-slate-400">·</span>
          <Calendar
            className={`shrink-0 text-slate-400 ${compact ? "h-3 w-3" : "h-3.5 w-3.5"}`}
          />
          <span className="truncate">{formatDispatchDate(job.scheduledDate)}</span>
        </div>
        <div className="flex items-center gap-1">
          <MapPin
            className={`shrink-0 text-slate-400 ${compact ? "h-3 w-3" : "h-3.5 w-3.5"}`}
          />
          <span className="truncate">
            {compact ? location : `${job.serviceAddress}, ${location}`}
          </span>
        </div>
        {!hideTechnician ? (
          <div className="flex items-center gap-1">
            <User
              className={`shrink-0 text-slate-400 ${compact ? "h-3 w-3" : "h-3.5 w-3.5"}`}
            />
            <span className="truncate">{technicianName ?? "Unassigned"}</span>
          </div>
        ) : null}
      </div>

      <div
        className={`flex items-center justify-between gap-2 border-t border-slate-100 ${
          compact ? "mt-1 pt-1 sm:mt-1.5 sm:pt-1.5" : "mt-3 pt-2.5"
        }`}
      >
        <DispatchStatusBadge
          status={job.status}
          className={compact ? "px-1.5 py-0 text-[10px]" : ""}
        />
        {!compact && job.priority === "urgent" ? (
          <span className="text-[10px] font-bold uppercase tracking-wide text-red-600">
            Urgent
          </span>
        ) : null}
      </div>
    </button>
  );
});
