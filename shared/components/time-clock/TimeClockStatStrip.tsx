import {
  SectionHeader,
  altairMcGridGapClass,
  altairMcMetricLabelClass,
  altairMcMetricValueClass,
  altairMcTileClass,
} from "@/shared/design-system/components";
import type { TechnicianTimeStatusCounts } from "@/shared/lib/technicians/technician-roster-time-status";
import type { ReportTimeTrackingSummary } from "@/shared/types/reports-page";
import type { TechnicianTimeState } from "@/shared/types/time-entry";

const STATUS_STRIP_ORDER: TechnicianTimeState[] = [
  "clocked_in",
  "working_job",
  "on_break",
  "off_clock",
];

const STATUS_STRIP_LABELS: Record<TechnicianTimeState, string> = {
  clocked_in: "Clocked in",
  working_job: "On job",
  on_break: "On break",
  off_clock: "Off clock",
};

type TimeClockStatStripProps = {
  statusCounts: TechnicianTimeStatusCounts;
  timeTracking: ReportTimeTrackingSummary;
  showRosterCounts: boolean;
};

export function TimeClockStatStrip({
  statusCounts,
  timeTracking,
  showRosterCounts,
}: TimeClockStatStripProps) {
  const staleCount = timeTracking.staleOpenShifts.length;

  return (
    <div className="space-y-3">
      {showRosterCounts ? (
        <section className="space-y-2">
          <SectionHeader title="Crew status" />
          <div
            className={`grid grid-cols-2 ${altairMcGridGapClass} lg:grid-cols-4`}
          >
            {STATUS_STRIP_ORDER.map((state) => (
              <div key={state} className={altairMcTileClass}>
                <p className={altairMcMetricLabelClass}>
                  {STATUS_STRIP_LABELS[state]}
                </p>
                <p className={altairMcMetricValueClass}>{statusCounts[state]}</p>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className="space-y-2">
        <SectionHeader title="Today" />
        <div
          className={`grid grid-cols-1 ${altairMcGridGapClass} sm:grid-cols-3`}
        >
          <div className={altairMcTileClass}>
            <p className={altairMcMetricLabelClass}>Hours today</p>
            <p className={altairMcMetricValueClass}>
              {timeTracking.shiftHoursToday}
              <span className="ml-1 text-base font-semibold text-altair-ink-on-paper-muted sm:text-lg">
                h
              </span>
            </p>
          </div>
          <div className={altairMcTileClass}>
            <p className={altairMcMetricLabelClass}>Open shifts</p>
            <p className={altairMcMetricValueClass}>
              {timeTracking.openShiftCount}
            </p>
          </div>
          <div className={altairMcTileClass}>
            <p className={altairMcMetricLabelClass}>Stale open</p>
            <p className={altairMcMetricValueClass}>{staleCount}</p>
            <p className="mt-1.5 text-xs font-medium text-altair-ink-on-paper-muted">
              Unclosed ≥ 12h
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
