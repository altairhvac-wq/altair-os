"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import {
  countJobsForTechnicianScheduleDay,
  getTechnicianWeekDays,
  type TechnicianScheduleDayContext,
} from "@/shared/lib/technician-week-schedule";
import { formatTechnicianLastUpdated } from "@/shared/lib/technician-refresh";
import type { TechnicianJob } from "@/shared/types/technician";

type TechnicianWeekStripProps = {
  jobs: TechnicianJob[];
  selectedDateOnly: string;
  scheduleContext: TechnicianScheduleDayContext;
  onSelectDateOnly: (dateOnly: string) => void;
  dayHeading?: string;
  queueLabel?: string;
  lastUpdatedAt?: Date;
  isRefreshing?: boolean;
};

export function TechnicianWeekStrip({
  jobs,
  selectedDateOnly,
  scheduleContext,
  onSelectDateOnly,
  dayHeading,
  queueLabel,
  lastUpdatedAt,
  isRefreshing = false,
}: TechnicianWeekStripProps) {
  const weekDays = getTechnicianWeekDays(
    scheduleContext.timeZone,
    scheduleContext.reference,
  );
  const isTodaySelected = selectedDateOnly === scheduleContext.todayDateOnly;
  const showSummary = dayHeading != null && queueLabel != null && lastUpdatedAt != null;
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    if (!showSummary || isRefreshing) {
      return;
    }

    const interval = window.setInterval(() => setNow(new Date()), 15_000);
    return () => window.clearInterval(interval);
  }, [showSummary, isRefreshing]);

  return (
    <section className="space-y-1" aria-label="Week schedule">
      {showSummary ? (
        <div
          className="flex min-h-6 items-center gap-1.5 px-0.5 text-xs"
          aria-live="polite"
        >
          <p className="shrink-0 font-semibold text-slate-900">{dayHeading}</p>
          <span className="text-slate-300" aria-hidden>
            ·
          </span>
          <p className="min-w-0 truncate font-medium text-slate-500">
            {queueLabel}
          </p>
          <span className="ml-auto shrink-0 text-slate-400">
            {isRefreshing ? (
              <span className="inline-flex items-center gap-1 font-medium text-slate-600">
                <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
                Updating…
              </span>
            ) : (
              formatTechnicianLastUpdated(lastUpdatedAt, now)
            )}
          </span>
        </div>
      ) : null}

      <div className="flex items-stretch gap-1">
        {!isTodaySelected ? (
          <button
            type="button"
            onClick={() => onSelectDateOnly(scheduleContext.todayDateOnly)}
            className="flex min-h-10 shrink-0 touch-manipulation items-center rounded-md bg-slate-100 px-2 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-200/80 active:bg-slate-200"
          >
            Today
          </button>
        ) : null}

        <div className="grid min-w-0 flex-1 grid-cols-7 gap-0.5">
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
                className={`relative flex min-h-10 touch-manipulation flex-col items-center justify-center gap-0 rounded-md px-0.5 py-1 transition-colors ${
                  isSelected
                    ? "bg-slate-900 text-white"
                    : day.isToday
                      ? "text-slate-700 ring-1 ring-cyan-500/50 hover:bg-slate-50 active:bg-slate-100"
                      : "text-slate-600 hover:bg-slate-50 active:bg-slate-100"
                }`}
              >
                <span
                  className={`text-[10px] font-semibold uppercase leading-none tracking-wide ${
                    isSelected ? "text-white/90" : "text-slate-500"
                  }`}
                >
                  {day.stripLabel}
                </span>
                <span
                  className={`text-xs font-semibold tabular-nums leading-tight ${
                    isSelected ? "text-white" : "text-slate-800"
                  }`}
                >
                  {day.dayOfMonth}
                </span>
                {jobCount > 0 ? (
                  <span
                    className={`text-[9px] font-medium tabular-nums leading-none ${
                      isSelected ? "text-white/75" : "text-slate-400"
                    }`}
                  >
                    {jobCount}
                  </span>
                ) : (
                  <span className="h-[9px]" aria-hidden />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
