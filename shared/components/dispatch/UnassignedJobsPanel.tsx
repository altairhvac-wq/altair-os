"use client";

import { memo, useMemo } from "react";
import { Inbox, Loader2, MapPin } from "lucide-react";
import {
  formatDispatchTime,
  formatFullAddress,
  sortDispatchJobsByPriorityThenStart,
  type DispatchJob,
  type DispatchJobPriority,
} from "@/shared/types/dispatch";
import { DemoDisplayName } from "@/shared/components/display/DemoDisplayName";
import { useCompanyTimezone } from "@/shared/lib/company-timezone";
import { STATUS_TONE_CLASS_ON_DARK } from "@/shared/design-system/components/status-tone";
import { dispatchMissionClasses as dm } from "./dispatch-board-presentation";

/* `high` and `urgent` painted the tone colour over a wash of itself, which on
 * this dark panel measured 2.99:1 and 2.36:1 — the two priorities that most
 * need to be read were the two hardest to read. See STATUS_TONE_CLASS_ON_DARK. */
const PRIORITY_BADGE: Record<DispatchJobPriority, string> = {
  low: STATUS_TONE_CLASS_ON_DARK.neutral,
  normal: "bg-white/10 text-altair-paper ring-white/20",
  high: STATUS_TONE_CLASS_ON_DARK.warning,
  urgent: STATUS_TONE_CLASS_ON_DARK.danger,
};

type UnassignedJobsPanelProps = {
  jobs: DispatchJob[];
  selectedJobId: string | null;
  pendingJobId?: string | null;
  onSelectJob: (job: DispatchJob) => void;
  emphasized?: boolean;
  /** Widen when the time grid is hidden (unassigned-only filter). */
  expanded?: boolean;
};

export const UnassignedJobsPanel = memo(function UnassignedJobsPanel({
  jobs,
  selectedJobId,
  pendingJobId = null,
  onSelectJob,
  emphasized = false,
  expanded = false,
}: UnassignedJobsPanelProps) {
  const timeZone = useCompanyTimezone();
  const sortedJobs = useMemo(
    () => sortDispatchJobsByPriorityThenStart(jobs),
    [jobs],
  );

  return (
    <section
      className={`${
        emphasized ? dm.unassignedSidebarEmphasis : dm.unassignedSidebar
      } ${expanded ? "lg:w-full lg:max-w-md" : ""}`}
      aria-label="Unassigned jobs"
    >
      <header className={dm.unassignedSidebarHeader}>
        <div className={dm.unassignedSidebarIcon}>
          <Inbox className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className={dm.unassignedSidebarTitle}>Unassigned Jobs</h3>
          <p className={dm.unassignedSidebarSubtitle}>
            Sorted by priority · needs assignment
          </p>
        </div>
        <span className={dm.unassignedSidebarCount}>{jobs.length}</span>
      </header>

      <div className={dm.unassignedSidebarList} data-no-pull-refresh>
        {sortedJobs.length === 0 ? (
          <div className={dm.unassignedSidebarEmpty}>
            <p className={dm.laneEmptyText}>No unassigned jobs</p>
          </div>
        ) : (
          sortedJobs.map((job) => {
            const isSelected = selectedJobId === job.id;
            const isAssigning = pendingJobId === job.id;
            const scheduledWindow = formatDispatchTime(
              job.scheduledDate,
              timeZone,
            );

            return (
              <button
                key={job.id}
                type="button"
                onClick={() => onSelectJob(job)}
                disabled={isAssigning}
                aria-busy={isAssigning}
                className={`${dm.unassignedSidebarRow} ${
                  isSelected ? dm.unassignedSidebarRowSelected : ""
                } ${isAssigning ? "opacity-80" : ""}`}
              >
                <div className="flex items-start justify-between gap-1.5">
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-altair-ink-on-graphite-muted tabular-nums">
                      {job.jobNumber}
                    </p>
                    <p className="truncate text-[12px] font-semibold text-altair-paper">
                      {job.jobType}
                    </p>
                    <p className="truncate text-[11px] text-altair-paper/70">
                      <DemoDisplayName>{job.customerName}</DemoDisplayName>
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    {isAssigning ? (
                      <Loader2
                        className="h-3 w-3 animate-spin text-altair-brass"
                        aria-hidden
                      />
                    ) : null}
                    <span
                      className={`inline-flex rounded-full px-1.5 py-0 text-[9px] font-semibold capitalize leading-none ring-1 ring-inset ${PRIORITY_BADGE[job.priority]}`}
                    >
                      {job.priority}
                    </span>
                  </div>
                </div>

                <div className="mt-1 flex items-start gap-1 text-[10px] text-altair-ink-on-graphite-muted">
                  <MapPin className="mt-0.5 h-3 w-3 shrink-0" aria-hidden />
                  <span className="line-clamp-2 leading-snug">
                    {formatFullAddress(job)}
                  </span>
                </div>

                <p className="mt-1 text-[10px] font-medium tabular-nums text-altair-paper/65">
                  Scheduled {scheduledWindow}
                </p>
              </button>
            );
          })
        )}
      </div>
    </section>
  );
});
