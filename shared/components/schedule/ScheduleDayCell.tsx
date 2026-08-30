import Link from "next/link";
import { ScheduleDayStatusDots } from "@/shared/components/schedule/ScheduleDayStatusDots";
import {
  SCHEDULE_STATUS_DOT_CLASS,
  SCHEDULE_STATUS_MIX_LABEL,
  SCHEDULE_STATUS_MIX_ORDER,
  type ScheduleWeekDaySummary,
} from "@/shared/lib/schedule-week";
import { altairReportTileClass } from "@/shared/design-system/components/report-surface";

type ScheduleDayCellProps = {
  summary: ScheduleWeekDaySummary;
  /** Week keeps labeled status rows; month compresses to count + dots + unassigned. */
  density: "week" | "month";
  /** Adjacent-month days on the month grid — real dates, visually deprioritized. */
  muted?: boolean;
};

function DayStatusMixLabeled({ day }: { day: ScheduleWeekDaySummary }) {
  const mix = SCHEDULE_STATUS_MIX_ORDER.filter((key) => day.counts[key] > 0);

  if (mix.length === 0) {
    return <p className="mt-2 text-[11px] text-altair-ink-muted">No jobs</p>;
  }

  return (
    <ul className="mt-2 flex flex-col gap-1" aria-label="Status mix">
      {mix.map((key) => (
        <li
          key={key}
          className="flex items-center gap-1.5 text-[11px] tabular-nums text-altair-paper/85"
        >
          <span
            className={`h-1.5 w-1.5 shrink-0 rounded-full ${SCHEDULE_STATUS_DOT_CLASS[key]}`}
            aria-hidden
          />
          <span className="min-w-0 truncate text-altair-ink-muted">
            {SCHEDULE_STATUS_MIX_LABEL[key]}
          </span>
          <span className="ml-auto font-semibold text-altair-paper">
            {day.counts[key]}
          </span>
        </li>
      ))}
    </ul>
  );
}

export function ScheduleDayCell({
  summary,
  density,
  muted = false,
}: ScheduleDayCellProps) {
  const { day, counts, hasUnassigned } = summary;
  const jobLabel = `${counts.activeTotal} job${counts.activeTotal === 1 ? "" : "s"}`;
  const isMonth = density === "month";

  return (
    <Link
      href={`/dispatch?date=${day.dateOnly}`}
      role="listitem"
      aria-label={`${day.stripLabel} ${day.dayOfMonth}, ${jobLabel}${day.isToday ? ", today" : ""}${hasUnassigned ? ", has unassigned" : ""}${muted ? ", outside month" : ""}`}
      className={`${altairReportTileClass} group flex flex-col transition-colors hover:border-altair-brass/40 hover:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] ${
        isMonth
          ? "min-h-[5.25rem] px-1.5 py-1.5 sm:min-h-[5.75rem] sm:px-2 sm:py-2"
          : "min-h-[9.5rem] px-3 py-2.5"
      } ${day.isToday ? "ring-1 ring-altair-brass/35" : ""} ${
        muted ? "opacity-45" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-1">
        <div className="min-w-0">
          {isMonth ? null : (
            <p className="text-[10px] font-semibold uppercase tracking-wide text-altair-ink-muted">
              {day.stripLabel}
              {day.isToday ? (
                <span className="ml-1 text-altair-brass">Today</span>
              ) : null}
            </p>
          )}
          {isMonth ? (
            <span
              className={`inline-flex h-6 min-w-6 items-center justify-center rounded-md px-1 text-xs font-bold tabular-nums leading-none sm:h-7 sm:min-w-7 sm:text-sm ${
                day.isToday
                  ? "bg-altair-brass/20 text-altair-brass ring-1 ring-altair-brass/45"
                  : "bg-white/[0.12] text-altair-paper ring-1 ring-white/[0.16]"
              }`}
            >
              {day.dayOfMonth}
            </span>
          ) : (
            <p
              className={`text-lg font-bold tabular-nums leading-tight ${
                day.isToday ? "text-altair-brass" : "text-altair-paper"
              }`}
            >
              {day.dayOfMonth}
            </p>
          )}
        </div>
        <p
          className={`shrink-0 text-right font-semibold tabular-nums text-altair-paper ${
            isMonth ? "text-[11px] sm:text-xs" : "text-xs"
          }`}
        >
          {counts.activeTotal}
          <span
            className={`mt-0.5 block font-medium text-altair-ink-muted ${
              isMonth ? "text-[9px]" : "text-[10px]"
            }`}
          >
            {counts.activeTotal === 1 ? "job" : "jobs"}
          </span>
        </p>
      </div>

      {isMonth ? (
        <div className="mt-auto flex flex-col gap-1 pt-1.5">
          {counts.activeTotal > 0 ? (
            <ScheduleDayStatusDots counts={counts} size="md" />
          ) : (
            <p className="text-[10px] text-altair-ink-muted">No jobs</p>
          )}
          {hasUnassigned ? (
            <p className="text-[9px] font-semibold leading-none text-altair-warning sm:text-[10px]">
              {counts.unassigned} unassigned
            </p>
          ) : null}
        </div>
      ) : (
        <>
          <DayStatusMixLabeled day={summary} />
          {hasUnassigned ? (
            <p className="mt-auto pt-2 text-[10px] font-semibold text-altair-warning">
              {counts.unassigned} unassigned
            </p>
          ) : (
            <span className="mt-auto pt-2" aria-hidden />
          )}
        </>
      )}
    </Link>
  );
}
