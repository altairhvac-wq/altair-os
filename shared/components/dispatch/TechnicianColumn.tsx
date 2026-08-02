import { memo, type ReactNode } from "react";
import type { DispatchJob, Technician } from "@/shared/types/dispatch";
import { TECHNICIAN_TIME_STATE_DOT_CLASS } from "@/shared/lib/dispatch-technician-time-state";
import {
  formatTechnicianTimeState,
  type TechnicianTimeState,
} from "@/shared/types/time-entry";
import { dispatchMissionClasses as dm } from "./dispatch-board-presentation";
import { DispatchJobCard } from "./DispatchJobCard";

type TechnicianColumnProps = {
  technician: Technician;
  jobs: DispatchJob[];
  selectedJobId: string | null;
  pendingJobId?: string | null;
  nextJobTime?: string | null;
  /** Legacy card lane, or horizontal Gantt time-track host. */
  layout?: "cards" | "time-track";
  trackWidthPx?: number;
  trackHeightPx?: number;
  /** Time-track body (hour lines + positioned blocks). */
  children?: ReactNode;
  emphasized?: boolean;
  onSelectJob: (job: DispatchJob) => void;
};

function resolveTimeState(technician: Technician): TechnicianTimeState {
  return technician.timeState ?? "off_clock";
}

export const TechnicianColumn = memo(function TechnicianColumn({
  technician,
  jobs,
  selectedJobId,
  pendingJobId = null,
  nextJobTime = null,
  layout = "cards",
  trackWidthPx,
  trackHeightPx,
  children,
  emphasized = false,
  onSelectJob,
}: TechnicianColumnProps) {
  const timeState = resolveTimeState(technician);
  const timeStateLabel = formatTechnicianTimeState(timeState);

  const identity = (
    <header className={dm.laneHeader}>
      <div className="flex min-w-0 items-center gap-1.5">
        <div className={dm.laneHeaderAvatar} aria-hidden>
          {technician.initials}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-1">
            <h3 className={`${dm.laneHeaderName} flex-1`} title={technician.name}>
              {technician.name}
            </h3>
            <span className={dm.laneHeaderCount}>{jobs.length}</span>
          </div>
          <p className={dm.laneHeaderRole} title={technician.role}>
            {technician.role}
          </p>
          <div className="mt-px flex min-w-0 items-center gap-1">
            <span
              className={`h-1.5 w-1.5 shrink-0 rounded-full ${TECHNICIAN_TIME_STATE_DOT_CLASS[timeState]}`}
              title={timeStateLabel}
              aria-hidden
            />
            <span className={`${dm.laneHeaderStatusLabel} truncate`}>
              {timeStateLabel}
            </span>
            {nextJobTime ? (
              <span className={`${dm.laneHeaderNextJob} truncate`}>
                · Next {nextJobTime}
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  );

  if (layout === "time-track") {
    return (
      <section
        className={`${dm.lane} ${emphasized ? "ring-2 ring-altair-warning/35" : ""}`}
        style={{
          height: trackHeightPx,
          minHeight: trackHeightPx,
        }}
        aria-label={`${technician.name} schedule, ${timeStateLabel}`}
      >
        {identity}
        <div
          className={dm.laneTrack}
          style={{
            width: trackWidthPx,
            minWidth: trackWidthPx,
            height: trackHeightPx,
            minHeight: trackHeightPx,
          }}
        >
          {children}
          {jobs.length === 0 ? (
            <div className={dm.laneEmptyOverlay}>
              <p className={dm.laneEmptyPill}>No jobs scheduled</p>
            </div>
          ) : null}
        </div>
      </section>
    );
  }

  return (
    <section className={`${dm.lane} !max-w-full w-full min-w-0`}>
      <div className="flex min-w-0 flex-col sm:flex-row sm:items-stretch">
        <div className="sm:w-44 sm:shrink-0 lg:w-48">{identity}</div>
        <div
          className="flex min-h-[4.25rem] min-w-0 flex-1 snap-x snap-mandatory gap-1.5 overflow-x-auto bg-white/[0.02] p-1.5 sm:min-h-[5.25rem] sm:gap-2 sm:p-2"
          data-no-pull-refresh
        >
          {jobs.length === 0 ? (
            <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-altair-border px-3 py-2.5 text-center">
              <p className={dm.laneEmptyText}>No jobs scheduled</p>
            </div>
          ) : (
            jobs.map((job) => (
              <DispatchJobCard
                key={job.id}
                job={job}
                compact
                hideTechnician
                isSelected={selectedJobId === job.id}
                isAssigning={pendingJobId === job.id}
                onSelect={onSelectJob}
              />
            ))
          )}
        </div>
      </div>
    </section>
  );
});
