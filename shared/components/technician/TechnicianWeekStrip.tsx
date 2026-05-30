"use client";

import {
  countJobsForTechnicianScheduleDay,
  getTechnicianWeekDays,
  type TechnicianScheduleDayContext,
} from "@/shared/lib/technician-week-schedule";
import type { TechnicianJob } from "@/shared/types/technician";

type TechnicianWeekStripProps = {
  jobs: TechnicianJob[];
  selectedDateOnly: string;
  scheduleContext: TechnicianScheduleDayContext;
  onSelectDateOnly: (dateOnly: string) => void;
};

export function TechnicianWeekStrip({
  jobs,
  selectedDateOnly,
  scheduleContext,
  onSelectDateOnly,
}: TechnicianWeekStripProps) {
  const weekDays = getTechnicianWeekDays(
    scheduleContext.timeZone,
    scheduleContext.reference,
  );

  return (
    <section
      className="rounded-lg border border-slate-200/80 bg-white px-1 py-2 shadow-sm"
      aria-label="Week schedule"
    >
      <div className="grid grid-cols-7 gap-0.5">
        {weekDays.map((day) => {
          const isSelected = day.dateOnly === selectedDateOnly;
          const jobCount = countJobsForTechnicianScheduleDay(
            jobs,
            day.dateOnly,
            scheduleContext,
          );

          return (
            <button
              key={day.dateOnly}
              type="button"
              onClick={() => onSelectDateOnly(day.dateOnly)}
              aria-pressed={isSelected}
              aria-label={`${day.stripLabel} ${day.dayOfMonth}, ${jobCount} job${jobCount === 1 ? "" : "s"}${day.isToday ? ", today" : ""}`}
              className={`flex min-h-14 touch-manipulation flex-col items-center justify-center gap-0.5 rounded-md px-0.5 py-1 transition-colors ${
                isSelected
                  ? "bg-slate-900 text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-50 active:bg-slate-100"
              }`}
            >
              <span
                className={`text-[10px] font-semibold uppercase tracking-wide ${
                  isSelected ? "text-white/90" : "text-slate-500"
                }`}
              >
                {day.stripLabel}
              </span>
              <span
                className={`text-xs font-semibold tabular-nums ${
                  isSelected ? "text-white" : "text-slate-800"
                }`}
              >
                {day.dayOfMonth}
              </span>
              <span
                className={`text-[10px] font-medium tabular-nums ${
                  isSelected ? "text-white/80" : "text-slate-400"
                }`}
              >
                {jobCount}
              </span>
              {day.isToday ? (
                <span
                  className={`h-1 w-1 rounded-full ${
                    isSelected ? "bg-cyan-300" : "bg-cyan-600"
                  }`}
                  aria-hidden
                />
              ) : (
                <span className="h-1 w-1" aria-hidden />
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
}
