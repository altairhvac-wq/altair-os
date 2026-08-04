import { ScheduleDayCell } from "@/shared/components/schedule/ScheduleDayCell";
import type { ScheduleWeekDaySummary } from "@/shared/lib/schedule-week";

type ScheduleWeekStripProps = {
  days: ScheduleWeekDaySummary[];
};

export function ScheduleWeekStrip({ days }: ScheduleWeekStripProps) {
  return (
    <div
      className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-7"
      role="list"
      aria-label="Week schedule"
    >
      {days.map((summary) => (
        <ScheduleDayCell
          key={summary.day.dateOnly}
          summary={summary}
          density="week"
        />
      ))}
    </div>
  );
}
