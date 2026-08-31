"use client";

import { memo, useEffect, useMemo } from "react";
import type { DispatchJob, Technician } from "@/shared/types/dispatch";
import { formatDispatchTime } from "@/shared/types/dispatch";
import { useCompanyTimezone } from "@/shared/lib/company-timezone";
import { dispatchTechnicianLaneDomId } from "@/shared/lib/dispatch-page-focus";
import {
  buildDispatchHourMarks,
  getLaneTrackHeightPx,
  getMaxStackIndex,
  getNowMarkerLeftPx,
  layoutDispatchTimeBlocks,
  resolveDispatchDayWindow,
  sortDispatchJobsByScheduledStart,
} from "@/shared/lib/dispatch-time-grid";
import { dispatchMissionClasses as dm } from "./dispatch-board-presentation";
import { DispatchTimeBlock } from "./DispatchTimeBlock";
import { TechnicianColumn } from "./TechnicianColumn";

type DispatchTimeGridProps = {
  technicians: Technician[];
  jobsByTechnician: Map<string, DispatchJob[]>;
  selectedJobId: string | null;
  pendingJobId: string | null;
  overloadedTechnicianIds?: string[];
  focusTechnicianId?: string | null;
  onSelectJob: (job: DispatchJob) => void;
};

export const DispatchTimeGrid = memo(function DispatchTimeGrid({
  technicians,
  jobsByTechnician,
  selectedJobId,
  pendingJobId,
  overloadedTechnicianIds = [],
  focusTechnicianId = null,
  onSelectJob,
}: DispatchTimeGridProps) {
  const timeZone = useCompanyTimezone();
  const overloaded = useMemo(
    () => new Set(overloadedTechnicianIds),
    [overloadedTechnicianIds],
  );

  useEffect(() => {
    if (!focusTechnicianId) return;
    const node = document.getElementById(
      dispatchTechnicianLaneDomId(focusTechnicianId),
    );
    if (!node) return;
    node.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
  }, [focusTechnicianId, technicians]);

  const allAssignedJobs = useMemo(() => {
    const jobs: DispatchJob[] = [];
    for (const tech of technicians) {
      const techJobs = jobsByTechnician.get(tech.id);
      if (techJobs) {
        jobs.push(...techJobs);
      }
    }
    return jobs;
  }, [jobsByTechnician, technicians]);

  const dayWindow = useMemo(
    () => resolveDispatchDayWindow(allAssignedJobs, timeZone),
    [allAssignedJobs, timeZone],
  );

  const hourMarks = useMemo(
    () => buildDispatchHourMarks(dayWindow),
    [dayWindow],
  );

  const nowLeftPx = useMemo(
    () => getNowMarkerLeftPx(dayWindow, { timeZone }),
    [dayWindow, timeZone],
  );

  const blocksByTechnician = useMemo(() => {
    const map = new Map<string, ReturnType<typeof layoutDispatchTimeBlocks>>();
    for (const tech of technicians) {
      const techJobs = jobsByTechnician.get(tech.id) ?? [];
      map.set(tech.id, layoutDispatchTimeBlocks(techJobs, dayWindow, timeZone));
    }
    return map;
  }, [dayWindow, jobsByTechnician, technicians, timeZone]);

  if (technicians.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-altair-border px-4 py-8 text-center">
        <p className="text-sm text-altair-ink-on-graphite-muted">
          No technicians to show on today&apos;s board.
        </p>
      </div>
    );
  }

  return (
    <div className={dm.timeGridScroll} data-no-pull-refresh data-testid="dispatch-schedule">
      <div className={`${dm.timeGridInner} w-max`}>
        {/* Horizontal time axis */}
        <div className={`${dm.timeAxisHeader} ${dm.timeAxisHeaderHeight}`}>
          <div className={dm.timeAxisSpacer} aria-hidden />
          <div
            className={dm.timeAxisTrack}
            style={{
              width: dayWindow.trackWidthPx,
              minWidth: dayWindow.trackWidthPx,
            }}
            aria-hidden
          >
            {hourMarks.map((mark, index) => {
              const isFirst = index === 0;
              const isLast = index === hourMarks.length - 1;
              return (
                <span
                  key={mark.hour}
                  className={`${dm.timeAxisLabel} ${
                    mark.isShoulder ? dm.timeAxisLabelShoulder : ""
                  }`}
                  style={{
                    left: mark.leftPx,
                    transform: isFirst
                      ? "translate(0, -50%)"
                      : isLast
                        ? "translate(-100%, -50%)"
                        : "translate(-50%, -50%)",
                  }}
                >
                  {mark.label}
                </span>
              );
            })}
          </div>
        </div>

        {technicians.map((technician) => {
          const techJobs = sortDispatchJobsByScheduledStart(
            jobsByTechnician.get(technician.id) ?? [],
          );
          const nextJob = techJobs[0];
          const blocks = blocksByTechnician.get(technician.id) ?? [];
          const trackHeightPx = getLaneTrackHeightPx(getMaxStackIndex(blocks));

          return (
            <TechnicianColumn
              key={technician.id}
              technician={technician}
              jobs={techJobs}
              selectedJobId={selectedJobId}
              pendingJobId={pendingJobId}
              nextJobTime={
                nextJob
                  ? formatDispatchTime(nextJob.scheduledDate, timeZone)
                  : null
              }
              layout="time-track"
              trackWidthPx={dayWindow.trackWidthPx}
              trackHeightPx={trackHeightPx}
              emphasized={
                overloaded.has(technician.id) ||
                focusTechnicianId === technician.id
              }
              focused={focusTechnicianId === technician.id}
              onSelectJob={onSelectJob}
            >
              {hourMarks.map((mark) =>
                mark.hour === dayWindow.endHour ? null : (
                  <div
                    key={`${technician.id}-${mark.hour}`}
                    className={
                      mark.isShoulder ? dm.hourLineShoulder : dm.hourLine
                    }
                    style={{ left: mark.leftPx }}
                  />
                ),
              )}

              {nowLeftPx !== null ? (
                <div className={dm.nowLine} style={{ left: nowLeftPx }}>
                  <span className={dm.nowDot} />
                </div>
              ) : null}

              {blocks.map((block) =>
                block.startMinutes === null ? null : (
                  <DispatchTimeBlock
                    key={block.job.id}
                    job={block.job}
                    leftPx={block.leftPx}
                    topOffsetPx={block.topOffsetPx}
                    isSelected={selectedJobId === block.job.id}
                    isAssigning={pendingJobId === block.job.id}
                    timeZone={timeZone}
                    onSelect={onSelectJob}
                  />
                ),
              )}
            </TechnicianColumn>
          );
        })}
      </div>
    </div>
  );
});
