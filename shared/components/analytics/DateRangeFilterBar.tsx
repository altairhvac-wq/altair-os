"use client";

import { CalendarRange, Download, RefreshCw } from "lucide-react";
import {
  ANALYTICS_DATE_RANGE_OPTIONS,
  type AnalyticsDateRange,
} from "@/shared/types/analytics";

type DateRangeFilterBarProps = {
  range: AnalyticsDateRange;
  onRangeChange: (range: AnalyticsDateRange) => void;
  lastUpdated?: string;
};

export function DateRangeFilterBar({
  range,
  onRangeChange,
  lastUpdated = "Just now",
}: DateRangeFilterBarProps) {
  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white">
          <CalendarRange className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-base font-bold text-slate-900">
            Owner Insights
          </h2>
          <p className="text-xs text-slate-500">
            Executive analytics across revenue, jobs, and field performance
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex flex-wrap gap-2">
          {ANALYTICS_DATE_RANGE_OPTIONS.map((option) => {
            const isActive = option.value === range;

            return (
              <button
                key={option.value}
                type="button"
                onClick={() => onRangeChange(option.value)}
                className={`rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${
                  isActive
                    ? "bg-slate-900 text-white shadow-sm"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2 border-t border-slate-100 pt-3 sm:border-t-0 sm:pt-0 sm:pl-2">
          <span className="hidden text-xs text-slate-400 lg:inline">
            Updated {lastUpdated}
          </span>
          <button
            type="button"
            aria-label="Refresh analytics"
            className="inline-flex items-center justify-center rounded-lg border border-slate-200 p-2 text-slate-600 transition-colors hover:bg-slate-50"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-lg bg-cyan-600 px-3 py-2 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-cyan-700"
          >
            <Download className="h-4 w-4" />
            Export
          </button>
        </div>
      </div>
    </div>
  );
}
