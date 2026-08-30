import { ScheduleDayCell } from "@/shared/components/schedule/ScheduleDayCell";
import type { ScheduleMonthDaySummary } from "@/shared/lib/schedule-month";

const WEEKDAY_HEADERS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

type ScheduleMonthGridProps = {
  days: ScheduleMonthDaySummary[];
};

export function ScheduleMonthGrid({ days }: ScheduleMonthGridProps) {
  return (
    <div className="flex flex-col gap-2" aria-label="Month schedule">
      <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
        {WEEKDAY_HEADERS.map((label) => (
          <div
            key={label}
            className="px-1 py-0.5 text-center text-[10px] font-semibold uppercase tracking-wide text-altair-ink-on-graphite-muted"
          >
            {label}
          </div>
        ))}
      </div>

      <div
        className="grid grid-cols-7 gap-1 sm:gap-1.5"
        role="list"
        aria-label="Month days"
      >
        {days.map((summary) => (
          <ScheduleDayCell
            key={summary.day.dateOnly}
            summary={summary}
            density="month"
            muted={!summary.day.isCurrentMonth}
          />
        ))}
      </div>
    </div>
  );
}
