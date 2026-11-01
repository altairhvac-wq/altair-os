import Link from "next/link";
import {
  buildDispatchStrip,
  DISPATCH_LANE_END_HOUR,
  DISPATCH_LANE_START_HOUR,
  formatTimeState,
} from "@/shared/lib/dashboard-overview";
import { DISPATCH_PAGE_TODAY_HREF } from "@/shared/lib/dispatch-page-focus";
import type { DashboardData } from "@/shared/types/dashboard";
import {
  OVERVIEW_CARD_CLASS,
  OverviewAvatar,
  OverviewCardHeader,
} from "./overview-chrome";

const LANE_LIMIT = 6;

function hourLabel(hour: number): string {
  if (hour === 12) return "12 PM";
  return hour > 12 ? `${hour - 12} PM` : `${hour} AM`;
}

const HOUR_TICKS = [7, 9, 11, 13, 15, 17, 19].filter(
  (hour) => hour >= DISPATCH_LANE_START_HOUR && hour <= DISPATCH_LANE_END_HOUR,
);

const STATE_DOT: Record<
  DashboardData["technicians"][number]["timeState"],
  string
> = {
  working_job: "bg-altair-success",
  clocked_in: "bg-altair-success",
  on_break: "bg-altair-warning",
  off_clock: "bg-altair-ink-on-paper-muted/50",
};

export function OverviewDispatchStrip({
  data,
  timeZone,
}: {
  data: DashboardData;
  timeZone: string;
}) {
  const strip = buildDispatchStrip(data, timeZone);
  const lanes = strip.lanes.slice(0, LANE_LIMIT);
  const hiddenLanes = strip.lanes.length - lanes.length;

  return (
    <section className={OVERVIEW_CARD_CLASS} aria-label="Dispatch overview">
      <OverviewCardHeader
        title="Dispatch overview"
        href={DISPATCH_PAGE_TODAY_HREF}
        hrefLabel="View dispatch"
      />
      {lanes.length === 0 ? (
        <p className="px-4 pb-4 text-xs text-altair-ink-on-paper-muted">
          No technicians on the roster yet. Invite your crew from Team.
        </p>
      ) : (
        <div className="grid gap-2.5 px-4 pb-3">
          <div
            className="grid grid-cols-[9.5rem_1fr] text-[10px] font-semibold uppercase tracking-[0.1em] text-altair-ink-on-paper-muted"
            aria-hidden="true"
          >
            <span />
            <span className="flex justify-between">
              {HOUR_TICKS.map((hour) => (
                <span key={hour}>{hourLabel(hour)}</span>
              ))}
            </span>
          </div>
          <ol className="grid gap-2.5">
            {lanes.map((lane) => (
              <li
                key={lane.technicianId}
                className="grid grid-cols-[9.5rem_1fr] items-center gap-2"
              >
                <div className="flex min-w-0 items-center gap-2">
                  <OverviewAvatar
                    initials={lane.initials}
                    dimmed={lane.timeState === "off_clock"}
                  />
                  <div className="min-w-0">
                    <p className="flex items-center gap-1.5 truncate text-xs font-semibold text-altair-ink-on-paper">
                      <span
                        aria-hidden="true"
                        className={`h-2 w-2 shrink-0 rounded-full ${STATE_DOT[lane.timeState]}`}
                      />
                      <span className="truncate">{lane.name}</span>
                    </p>
                    <p className="truncate text-[11px] text-altair-ink-on-paper-secondary">
                      {lane.jobCount} {lane.jobCount === 1 ? "job" : "jobs"} ·{" "}
                      {formatTimeState(lane.timeState).toLowerCase()}
                    </p>
                  </div>
                </div>
                <div
                  className="relative h-3.5 rounded-full bg-altair-paper-subtle"
                  role="list"
                  aria-label={`${lane.name}, ${lane.jobCount} jobs today`}
                >
                  {lane.markers.map((marker) => (
                    <Link
                      key={marker.jobId}
                      role="listitem"
                      href={`/work/${marker.jobId}`}
                      title={marker.label}
                      aria-label={marker.label}
                      className={`absolute -top-[3px] h-5 w-5 -translate-x-1/2 rounded-full border-2 border-altair-paper shadow-[0_0_0_1px_var(--border)] transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] ${
                        marker.status === "completed"
                          ? "bg-altair-success"
                          : marker.status === "scheduled"
                            ? "bg-altair-brass"
                            : "bg-altair-information"
                      }`}
                      style={{ left: `${marker.percent}%` }}
                    />
                  ))}
                </div>
              </li>
            ))}
          </ol>
          {hiddenLanes > 0 ? (
            <p className="text-[11px] text-altair-ink-on-paper-muted">
              {hiddenLanes} more {hiddenLanes === 1 ? "technician" : "technicians"} on
              the dispatch board.
            </p>
          ) : null}
          <div className="mt-0.5 grid grid-cols-3 gap-2">
            <span className="flex items-center justify-center rounded-[var(--radius-control)] bg-altair-success-surface px-2 py-2 text-xs font-bold text-altair-success-foreground">
              {strip.assignedJobs} assigned
            </span>
            <span className="flex items-center justify-center rounded-[var(--radius-control)] bg-altair-paper-subtle px-2 py-2 text-xs font-bold text-altair-ink-on-paper-secondary">
              {strip.clockedIn} clocked in
            </span>
            <span
              className={`flex items-center justify-center rounded-[var(--radius-control)] px-2 py-2 text-xs font-bold ${
                strip.unassignedJobs > 0
                  ? "bg-altair-warning-surface text-altair-warning-foreground"
                  : "bg-altair-paper-subtle text-altair-ink-on-paper-secondary"
              }`}
            >
              {strip.unassignedJobs} unassigned
            </span>
          </div>
        </div>
      )}
    </section>
  );
}
