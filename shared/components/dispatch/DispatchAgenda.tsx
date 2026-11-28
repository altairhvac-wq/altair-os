"use client";

import { memo, useEffect, useMemo } from "react";
import { ChevronRight, Loader2 } from "lucide-react";
import { DemoDisplayName } from "@/shared/components/display/DemoDisplayName";
import { TECHNICIAN_TIME_STATE_DOT_CLASS } from "@/shared/lib/dispatch-technician-time-state";
import { sortDispatchJobsByScheduledStart } from "@/shared/lib/dispatch-time-grid";
import { useCompanyTimezone } from "@/shared/lib/company-timezone";
import { formatDateInTimeZone, getDateOnlyInTimeZone } from "@/shared/lib/datetime";
import {
  formatDispatchStatus,
  formatDispatchTime,
  type DispatchJob,
  type DispatchJobPriority,
  type Technician,
} from "@/shared/types/dispatch";
import { formatTechnicianTimeState } from "@/shared/types/time-entry";
import { altairReportCardClass } from "@/shared/design-system/components/report-surface";
import { DispatchStatusBadge } from "./DispatchStatusBadge";

/**
 * The technician schedule on a phone (UI audit 2026-11-12, item A8).
 *
 * The desktop board is a timeline: one row per technician, 96px per hour. A
 * phone is 390px wide and the technician's name took 168px of it, so the board
 * showed 7 AM and 8 AM and cut off the rest of the day. No width of name
 * column fixes that: eleven hours do not fit across a phone.
 *
 * So below 768px the same jobs are a list instead. One card per technician,
 * their jobs in start-time order, each row a full-width button that opens the
 * same job panel the timeline opens. Nothing scrolls sideways.
 *
 * The board also carries jobs from an earlier day that are still open (en
 * route, on site). The timeline places those by time of day only. In a list
 * that would read as "9:30 AM" ahead of "8:00 AM" with no reason given, so a
 * job from another day shows its date above its time.
 */

const PRIORITY_ACCENT: Record<DispatchJobPriority, string> = {
  low: "bg-transparent",
  normal: "bg-transparent",
  high: "bg-altair-warning",
  urgent: "bg-altair-danger",
};

const PRIORITY_NOTE: Partial<Record<DispatchJobPriority, string>> = {
  high: "High priority",
  urgent: "Urgent",
};

/** DOM id for a technician's card in the phone list (the timeline lane has its own). */
export function dispatchAgendaTechnicianDomId(technicianId: string): string {
  return `dispatch-agenda-technician-${technicianId}`;
}

type DispatchAgendaProps = {
  technicians: Technician[];
  jobsByTechnician: Map<string, DispatchJob[]>;
  selectedJobId: string | null;
  pendingJobId: string | null;
  focusTechnicianId?: string | null;
  /** The day the board shows (YYYY-MM-DD). Omitted when the board is today. */
  boardDateOnly?: string;
  onSelectJob: (job: DispatchJob) => void;
  className?: string;
};

export const DispatchAgenda = memo(function DispatchAgenda({
  technicians,
  jobsByTechnician,
  selectedJobId,
  pendingJobId,
  focusTechnicianId = null,
  boardDateOnly,
  onSelectJob,
  className = "",
}: DispatchAgendaProps) {
  const timeZone = useCompanyTimezone();
  const boardDay = useMemo(
    () => boardDateOnly ?? getDateOnlyInTimeZone(new Date(), timeZone),
    [boardDateOnly, timeZone],
  );

  useEffect(() => {
    if (!focusTechnicianId) return;
    const node = document.getElementById(
      dispatchAgendaTechnicianDomId(focusTechnicianId),
    );
    // Hidden at desktop widths, where the timeline handles the same focus.
    if (!node || node.offsetParent === null) return;
    node.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [focusTechnicianId, technicians]);

  if (technicians.length === 0) {
    return (
      <div
        className={`rounded-lg border border-dashed border-altair-border px-4 py-8 text-center ${className}`}
      >
        <p className="text-sm text-altair-ink-on-graphite-muted">
          No technicians to show on today&apos;s board.
        </p>
      </div>
    );
  }

  return (
    <div
      className={`flex flex-col gap-2 ${className}`}
      data-testid="dispatch-agenda"
    >
      {technicians.map((technician) => {
        const jobs = sortDispatchJobsByScheduledStart(
          jobsByTechnician.get(technician.id) ?? [],
        );
        const timeState = technician.timeState ?? "off_clock";
        const timeStateLabel = formatTechnicianTimeState(timeState);
        const focused = focusTechnicianId === technician.id;

        return (
          <section
            key={technician.id}
            id={dispatchAgendaTechnicianDomId(technician.id)}
            data-testid="dispatch-agenda-technician"
            aria-label={`${technician.name}, ${timeStateLabel}, ${jobs.length} ${jobs.length === 1 ? "job" : "jobs"}`}
            className={`${altairReportCardClass} scroll-mt-20 overflow-hidden ${
              focused ? "ring-2 ring-altair-brass/55" : ""
            }`}
          >
            <header className="flex items-center gap-3 border-b border-altair-border bg-altair-graphite px-3 py-2.5">
              <div
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-altair-brass/20 text-xs font-bold text-altair-brass-interactive ring-1 ring-altair-brass/30"
                aria-hidden
              >
                {technician.initials}
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="truncate text-sm font-bold leading-tight text-altair-paper">
                  {technician.name}
                </h3>
                <p className="mt-0.5 flex items-center gap-1.5 text-xs leading-tight text-altair-paper/75">
                  <span
                    className={`h-2 w-2 shrink-0 rounded-full ${TECHNICIAN_TIME_STATE_DOT_CLASS[timeState]}`}
                    aria-hidden
                  />
                  <span className="truncate">{timeStateLabel}</span>
                </p>
              </div>
              <span className="shrink-0 text-xs font-semibold tabular-nums text-altair-paper/75">
                {jobs.length} {jobs.length === 1 ? "job" : "jobs"}
              </span>
            </header>

            {jobs.length === 0 ? (
              <p className="px-3 py-3 text-xs text-altair-ink-on-graphite-muted">
                No jobs scheduled.
              </p>
            ) : (
              <ul className="divide-y divide-altair-border/60">
                {jobs.map((job) => {
                  const startLabel = formatDispatchTime(
                    job.scheduledDate,
                    timeZone,
                  );
                  const scheduledAt = new Date(job.scheduledDate);
                  const otherDayLabel =
                    !Number.isNaN(scheduledAt.getTime()) &&
                    getDateOnlyInTimeZone(scheduledAt, timeZone) !== boardDay
                      ? formatDateInTimeZone(scheduledAt, timeZone, {
                          month: "short",
                          day: "numeric",
                        })
                      : null;
                  const isSelected = selectedJobId === job.id;
                  const isAssigning = pendingJobId === job.id;
                  const priorityNote = PRIORITY_NOTE[job.priority];

                  return (
                    <li key={job.id}>
                      <button
                        type="button"
                        onClick={() => onSelectJob(job)}
                        disabled={isAssigning}
                        aria-busy={isAssigning}
                        aria-label={`${otherDayLabel ? `${otherDayLabel}, ` : ""}${startLabel}: ${job.jobType} for ${job.customerName}, ${formatDispatchStatus(job.status)}${priorityNote ? `, ${priorityNote}` : ""}`}
                        data-testid="dispatch-agenda-job"
                        className={`relative flex min-h-14 w-full items-center gap-2.5 py-2.5 pl-4 pr-2 text-left transition-colors hover:bg-white/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--focus-ring)] ${
                          isSelected ? "bg-altair-information/15" : ""
                        } ${isAssigning ? "opacity-80" : ""}`}
                      >
                        <span
                          className={`absolute inset-y-0 left-0 w-1 ${PRIORITY_ACCENT[job.priority]}`}
                          aria-hidden
                        />
                        <span className="w-[4.25rem] shrink-0 tabular-nums leading-tight">
                          {otherDayLabel ? (
                            <span
                              className="block text-[11px] font-semibold text-altair-warning-surface"
                              data-testid="dispatch-agenda-other-day"
                            >
                              {otherDayLabel}
                            </span>
                          ) : null}
                          <span className="block text-[13px] font-bold text-altair-paper">
                            {startLabel}
                          </span>
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold leading-tight text-altair-paper">
                            {job.jobType}
                          </span>
                          <span className="mt-1 flex min-w-0 items-center gap-2">
                            <span className="min-w-0 flex-1 truncate text-xs leading-tight text-altair-paper/75">
                              <DemoDisplayName>{job.customerName}</DemoDisplayName>
                              {priorityNote ? ` · ${priorityNote}` : ""}
                            </span>
                            <DispatchStatusBadge
                              status={job.status}
                              northStar
                              className="shrink-0"
                            />
                          </span>
                        </span>
                        {isAssigning ? (
                          <Loader2
                            className="h-4 w-4 shrink-0 animate-spin text-altair-brass-interactive"
                            aria-hidden
                          />
                        ) : (
                          <ChevronRight
                            className="h-4 w-4 shrink-0 text-altair-paper/50"
                            aria-hidden
                          />
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
});
