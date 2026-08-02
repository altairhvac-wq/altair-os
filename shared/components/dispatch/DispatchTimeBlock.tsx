"use client";

import { memo } from "react";
import { Loader2 } from "lucide-react";
import {
  DISPATCH_LANE_TRACK_PADDING_Y_PX,
  DISPATCH_TIME_BLOCK_HEIGHT_PX,
  DISPATCH_TIME_BLOCK_WIDTH_PX,
} from "@/shared/lib/dispatch-time-grid";
import {
  formatDispatchStatus,
  formatDispatchTime,
  type DispatchJob,
  type DispatchJobPriority,
  type DispatchJobStatus,
} from "@/shared/types/dispatch";
import { DemoDisplayName } from "@/shared/components/display/DemoDisplayName";

/**
 * Saturated priority fills for dark Graphite lanes — readable on dark,
 * not the soft light-theme MC tints.
 */
const BLOCK_PRIORITY_SURFACE: Record<DispatchJobPriority, string> = {
  low: "bg-white/[0.07]",
  normal: "bg-altair-information/40",
  high: "bg-altair-warning/45",
  urgent: "bg-altair-danger/45",
};

const BLOCK_PRIORITY_ACCENT: Record<DispatchJobPriority, string> = {
  low: "bg-altair-border-strong",
  normal: "bg-altair-information",
  high: "bg-altair-warning",
  urgent: "bg-altair-danger",
};

const BLOCK_PRIORITY_BADGE: Record<DispatchJobPriority, string> = {
  low: "bg-white/10 text-altair-ink-muted ring-white/15",
  normal: "bg-altair-information/25 text-altair-paper ring-altair-information/40",
  high: "bg-altair-warning/30 text-altair-warning ring-altair-warning/45",
  urgent: "bg-altair-danger/30 text-altair-danger ring-altair-danger/45",
};

const BLOCK_STATUS_BADGE: Record<DispatchJobStatus, string> = {
  scheduled: "bg-altair-information/25 text-altair-paper ring-altair-information/35",
  dispatched: "bg-altair-information/25 text-altair-paper ring-altair-information/35",
  arrived: "bg-altair-information/30 text-altair-paper ring-altair-information/40",
  in_progress: "bg-altair-warning/30 text-altair-warning ring-altair-warning/40",
  completed: "bg-altair-success/25 text-altair-success ring-altair-success/40",
  cancelled: "bg-white/10 text-altair-ink-muted ring-white/15",
};

const BADGE_BASE =
  "inline-flex rounded-full px-1 py-px text-[7px] font-semibold leading-none ring-1 ring-inset capitalize";

type DispatchTimeBlockProps = {
  job: DispatchJob;
  leftPx: number;
  topOffsetPx?: number;
  isSelected?: boolean;
  isAssigning?: boolean;
  timeZone?: string;
  onSelect: (job: DispatchJob) => void;
};

/**
 * Fixed-width start-time chip for the horizontal dispatch Gantt.
 * Left edge = scheduled_at. Width/height are fixed — never duration-derived.
 */
export const DispatchTimeBlock = memo(function DispatchTimeBlock({
  job,
  leftPx,
  topOffsetPx = 0,
  isSelected = false,
  isAssigning = false,
  timeZone,
  onSelect,
}: DispatchTimeBlockProps) {
  const startLabel = formatDispatchTime(job.scheduledDate, timeZone);
  const selectedClass = isSelected
    ? "ring-2 ring-altair-brass/45 border-altair-brass/50"
    : "border-white/10 hover:border-altair-brass/35";
  const assigningClass = isAssigning ? "opacity-80" : "";

  return (
    <button
      type="button"
      onClick={() => onSelect(job)}
      disabled={isAssigning}
      aria-busy={isAssigning}
      aria-label={`Starts at ${startLabel}: ${job.jobNumber}, ${job.jobType} for ${job.customerName}, ${formatDispatchStatus(job.status)}, ${job.priority} priority`}
      title={`Starts ${startLabel} · ${job.jobNumber} · ${job.priority}`}
      style={{
        left: leftPx,
        top: DISPATCH_LANE_TRACK_PADDING_Y_PX + topOffsetPx,
        width: DISPATCH_TIME_BLOCK_WIDTH_PX,
        height: DISPATCH_TIME_BLOCK_HEIGHT_PX,
      }}
      className={`absolute z-10 overflow-hidden rounded-md border text-left shadow-md shadow-black/25 transition-[border-color,box-shadow,opacity] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-altair-brass/40 ${BLOCK_PRIORITY_SURFACE[job.priority]} ${selectedClass} ${assigningClass}`}
    >
      <span
        className={`absolute inset-y-0 left-0 w-1 ${BLOCK_PRIORITY_ACCENT[job.priority]}`}
        aria-hidden
      />
      <span
        className={`absolute inset-x-0 top-0 h-0.5 ${BLOCK_PRIORITY_ACCENT[job.priority]}`}
        aria-hidden
      />

      <span className="flex h-full flex-col justify-center gap-px py-0.5 pl-2 pr-1">
        <span className="flex min-w-0 items-center gap-1">
          <span className="shrink-0 whitespace-nowrap text-[9px] font-bold tabular-nums leading-none text-altair-paper">
            {startLabel}
          </span>
          <span className="min-w-0 truncate text-[8px] font-semibold uppercase tracking-wide text-altair-paper/70 tabular-nums leading-none">
            {job.jobNumber}
          </span>
          {isAssigning ? (
            <Loader2
              className="ml-auto h-2.5 w-2.5 shrink-0 animate-spin text-altair-brass"
              aria-hidden
            />
          ) : (
            <span
              className={`${BADGE_BASE} ${BLOCK_PRIORITY_BADGE[job.priority]} ml-auto`}
            >
              {job.priority}
            </span>
          )}
        </span>

        <span className="line-clamp-1 min-w-0 text-[10px] font-semibold leading-tight text-altair-paper">
          {job.jobType}
        </span>

        <span className="flex min-w-0 items-center gap-1">
          <span className="min-w-0 flex-1 truncate text-[9px] leading-none text-altair-paper/75">
            <DemoDisplayName>{job.customerName}</DemoDisplayName>
          </span>
          <span
            className={`${BADGE_BASE} ${BLOCK_STATUS_BADGE[job.status]} shrink-0`}
          >
            {formatDispatchStatus(job.status)}
          </span>
        </span>
      </span>
    </button>
  );
});
