import { memo } from "react";
import { Calendar, Clock, Loader2, MapPin, User } from "lucide-react";
import {
  formatDispatchDate,
  formatDispatchTime,
  type DispatchJob,
} from "@/shared/types/dispatch";
import { DemoDisplayName } from "@/shared/components/display/DemoDisplayName";
import { northStarDispatchTokens as dt } from "@/shared/design-system/north-star/tokens";
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
  northStar?: boolean;
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
  northStar = false,
  onSelect,
}: DispatchJobCardProps) {
  const location = `${job.city}, ${job.state}`;

  const cardStateClass = northStar
    ? isAssigning
      ? dt.jobCardAssigning
      : isSelected
        ? dt.jobCardSelected
        : ""
    : isAssigning
      ? "border-cyan-400/60 bg-cyan-50/35 opacity-90"
      : isSelected
        ? "border-cyan-600/70 bg-cyan-50/45 shadow-sm ring-1 ring-cyan-500/20"
        : "border-slate-200/90 bg-white shadow-sm hover:border-slate-300/90 hover:shadow-md";

  const baseCardClass = northStar
    ? compact
      ? dt.jobCardCompact
      : dt.jobCard
    : `snap-start rounded-xl border text-left transition-[border-color,box-shadow,background-color] ${
        compact ? "w-[11.5rem] shrink-0 p-2 sm:w-52 sm:p-2.5" : "w-full p-3.5"
      }`;

  return (
    <button
      type="button"
      onClick={() => onSelect(job)}
      disabled={isAssigning}
      aria-busy={isAssigning}
      className={`${baseCardClass} ${cardStateClass} ${northStar ? "" : "transition-[border-color,box-shadow,background-color]"} ${className}`}
    >
      <div className="flex items-start justify-between gap-1.5">
        <div className="min-w-0 flex-1">
          <p
            className={
              northStar
                ? `${dt.jobCardJobNumber} ${compact ? "text-[10px]" : "text-[11px]"}`
                : `font-semibold uppercase tracking-wide text-slate-500 tabular-nums ${
                    compact ? "text-[10px]" : "text-[11px]"
                  }`
            }
          >
            {job.jobNumber}
          </p>
          <h4
            className={
              northStar
                ? `${dt.jobCardCustomer} ${compact ? "text-sm" : "mt-0.5 text-base"}`
                : `truncate font-bold tracking-tight text-slate-900 ${
                    compact ? "text-xs" : "mt-0.5 text-sm"
                  }`
            }
          >
            <DemoDisplayName>{job.customerName}</DemoDisplayName>
          </h4>
          <p
            className={
              northStar
                ? `${dt.jobCardService} ${compact ? "text-[11px]" : "mt-0.5 text-xs"}`
                : compact
                  ? "truncate text-[11px] text-slate-500"
                  : "mt-0.5 truncate text-xs text-slate-500"
            }
          >
            {job.jobType}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {isAssigning ? (
            <Loader2
              className={
                northStar
                  ? dt.jobCardLoader
                  : "h-3.5 w-3.5 animate-spin text-cyan-600"
              }
              aria-hidden="true"
            />
          ) : null}
          <DispatchPriorityBadge
            priority={job.priority}
            northStar={northStar}
            className={compact ? "px-1.5 py-0 text-[10px]" : ""}
          />
        </div>
      </div>

      <div
        className={
          northStar
            ? `${dt.jobCardMeta} ${
                compact
                  ? "mt-1.5 space-y-0.5 text-[11px] sm:space-y-1"
                  : "mt-3 space-y-1.5 text-xs"
              }`
            : `text-slate-600 ${
                compact
                  ? "mt-1 space-y-0.5 text-[11px] sm:mt-1.5 sm:space-y-1"
                  : "mt-3 space-y-1.5 text-xs"
              }`
        }
      >
        <div className="flex items-center gap-1">
          <Clock
            className={
              northStar
                ? `${dt.jobCardMetaIcon} ${compact ? "h-3 w-3" : "h-3.5 w-3.5"}`
                : `shrink-0 text-slate-400 ${compact ? "h-3 w-3" : "h-3.5 w-3.5"}`
            }
          />
          <span
            className={
              northStar
                ? dt.jobCardMetaTime
                : "font-medium text-slate-700"
            }
          >
            {formatDispatchTime(job.scheduledDate)}
          </span>
          <span className={northStar ? "text-[#AEB6C2]" : "text-slate-400"}>
            ·
          </span>
          <Calendar
            className={
              northStar
                ? `${dt.jobCardMetaIcon} ${compact ? "h-3 w-3" : "h-3.5 w-3.5"}`
                : `shrink-0 text-slate-400 ${compact ? "h-3 w-3" : "h-3.5 w-3.5"}`
            }
          />
          <span className="truncate">{formatDispatchDate(job.scheduledDate)}</span>
        </div>
        <div className="flex items-center gap-1">
          <MapPin
            className={
              northStar
                ? `${dt.jobCardMetaIcon} ${compact ? "h-3 w-3" : "h-3.5 w-3.5"}`
                : `shrink-0 text-slate-400 ${compact ? "h-3 w-3" : "h-3.5 w-3.5"}`
            }
          />
          <span className="truncate">
            {compact ? location : `${job.serviceAddress}, ${location}`}
          </span>
        </div>
        {!hideTechnician ? (
          <div className="flex items-center gap-1">
            <User
              className={
                northStar
                  ? `${dt.jobCardMetaIcon} ${compact ? "h-3 w-3" : "h-3.5 w-3.5"}`
                  : `shrink-0 text-slate-400 ${compact ? "h-3 w-3" : "h-3.5 w-3.5"}`
              }
            />
            <span className="truncate">{technicianName ?? "Unassigned"}</span>
          </div>
        ) : null}
      </div>

      <div
        className={`flex items-center justify-between gap-2 ${
          northStar
            ? `${dt.jobCardFooter} ${
                compact ? "mt-1.5 pt-1.5 sm:mt-2 sm:pt-2" : "mt-3 pt-2.5"
              }`
            : `border-t border-slate-100 ${
                compact ? "mt-1 pt-1 sm:mt-1.5 sm:pt-1.5" : "mt-3 pt-2.5"
              }`
        }`}
      >
        <DispatchStatusBadge
          status={job.status}
          northStar={northStar}
          className={compact ? "px-1.5 py-0 text-[10px]" : ""}
        />
        {!compact && job.priority === "urgent" ? (
          <span
            className={
              northStar
                ? "text-[10px] font-bold uppercase tracking-wide text-rose-300"
                : "text-[10px] font-bold uppercase tracking-wide text-rose-700"
            }
          >
            Urgent
          </span>
        ) : null}
      </div>
    </button>
  );
});
