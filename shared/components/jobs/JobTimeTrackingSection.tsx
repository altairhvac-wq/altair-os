import { Clock } from "lucide-react";
import { JOB_DETAIL_TIME_TRACKING_ANCHOR } from "@/shared/lib/jobs/job-detail-anchors";
import {
  jobDetailEmptyHintClass,
  jobDetailEmptyStateClass,
  jobDetailEmptyTitleClass,
  jobDetailPrimaryTextClass,
  jobDetailSectionIconWrapClass,
  jobDetailSectionSubtitleClass,
  jobDetailSectionTitleClass,
  resolveJobDetailSectionClass,
} from "@/shared/components/jobs/job-detail-section-styles";
import {
  formatDateTime,
  formatDurationMinutes,
  resolveClosedJobLaborMinutes,
  type TimeEntry,
} from "@/shared/types/time-entry";

type JobTimeTrackingSectionProps = {
  jobId: string;
  laborEntries: TimeEntry[];
  northStar?: boolean;
};

function SegmentMetaItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </p>
      <p className="mt-0.5 text-sm font-medium text-slate-900">{value}</p>
    </div>
  );
}

function sumClosedLaborMinutes(entries: TimeEntry[]): number {
  let total = 0;
  for (const entry of entries) {
    const minutes = resolveClosedJobLaborMinutes(entry);
    if (minutes != null) {
      total += minutes;
    }
  }
  return total;
}

export function JobTimeTrackingSection({
  jobId,
  laborEntries,
  northStar = false,
}: JobTimeTrackingSectionProps) {
  const closedMinutes = sumClosedLaborMinutes(laborEntries);
  const closedCount = laborEntries.filter(
    (entry) => resolveClosedJobLaborMinutes(entry) != null,
  ).length;

  return (
    <section
      aria-labelledby={`job-time-tracking-heading-${jobId}`}
      id={northStar ? JOB_DETAIL_TIME_TRACKING_ANCHOR : undefined}
      data-job-section={northStar ? JOB_DETAIL_TIME_TRACKING_ANCHOR : undefined}
      tabIndex={northStar ? -1 : undefined}
      className={`${resolveJobDetailSectionClass(northStar)} scroll-mt-6`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className={jobDetailSectionIconWrapClass(northStar)}>
            <Clock className={northStar ? "h-4 w-4" : "h-5 w-5 text-cyan-600"} />
          </div>
          <div>
            <h2
              id={`job-time-tracking-heading-${jobId}`}
              className={jobDetailSectionTitleClass(northStar)}
            >
              Time tracking
            </h2>
            <p className={jobDetailSectionSubtitleClass(northStar)}>
              Job labor segments clocked against this job
            </p>
          </div>
        </div>

        {closedCount > 0 ? (
          <div className="text-right">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              Total closed
            </p>
            <p className="text-sm font-semibold tabular-nums text-slate-900">
              {formatDurationMinutes(closedMinutes)}
            </p>
          </div>
        ) : null}
      </div>

      {laborEntries.length === 0 ? (
        <div className={`mt-4 ${jobDetailEmptyStateClass(northStar)}`}>
          <p className={jobDetailEmptyTitleClass(northStar)}>
            No labor time logged yet
          </p>
          <p className={jobDetailEmptyHintClass(northStar)}>
            Job labor segments will appear here when technicians clock time on
            this job.
          </p>
        </div>
      ) : (
        <ul className="mt-4 space-y-3">
          {laborEntries.map((entry) => {
            const closedMinutesForEntry = resolveClosedJobLaborMinutes(entry);
            const isOpen = entry.endedAt == null;

            return (
              <li
                key={entry.id}
                className={
                  northStar
                    ? "rounded-lg border border-altair-border bg-[var(--surface-tile)] px-4 py-3"
                    : "rounded-xl border border-slate-200 bg-white px-4 py-3"
                }
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <p className={jobDetailPrimaryTextClass(northStar)}>
                    {entry.technicianName.trim() || "Technician"}
                  </p>
                  {closedMinutesForEntry != null ? (
                    <p className="text-sm font-semibold tabular-nums text-slate-900">
                      {formatDurationMinutes(closedMinutesForEntry)}
                    </p>
                  ) : null}
                </div>

                <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <SegmentMetaItem
                    label="Start"
                    value={formatDateTime(entry.startedAt)}
                  />
                  <SegmentMetaItem
                    label="End"
                    value={
                      isOpen ? "In progress" : formatDateTime(entry.endedAt!)
                    }
                  />
                  <SegmentMetaItem
                    label="Duration"
                    value={
                      closedMinutesForEntry != null
                        ? formatDurationMinutes(closedMinutesForEntry)
                        : "—"
                    }
                  />
                  <SegmentMetaItem
                    label="Notes"
                    value={entry.notes?.trim() || "—"}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
