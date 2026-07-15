"use client";

import { useRouter, useSearchParams } from "next/navigation";
import {
  adminSegmentedControlClass,
  adminSegmentedItemActiveClass,
  adminSegmentedItemClass,
} from "@/shared/design-system/shell/tokens";
import {
  REPORTS_PAGE_DATE_RANGE_OPTIONS,
  type ReportsPageDateRange,
} from "@/shared/types/reports-page";
import {
  isNorthStarReportSurface,
  type ReportSurfaceVariant,
} from "./report-surface-variant";

type ReportDateRangeBarProps = {
  range: ReportsPageDateRange;
  variant?: ReportSurfaceVariant;
};

export function ReportDateRangeBar({
  range,
  variant = "legacy",
}: ReportDateRangeBarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const northStar = isNorthStarReportSurface(variant);

  const handleRangeChange = (nextRange: ReportsPageDateRange) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("range", nextRange);
    router.push(`/reports?${params.toString()}`);
  };

  if (northStar) {
    return (
      <div className="min-w-0 rounded-[1rem] border border-[rgba(138,99,36,0.12)] bg-[#EFE4CB] px-3 py-2.5 sm:px-4">
        <div className="grid w-full grid-cols-2 gap-0.5 rounded-lg border border-[rgba(138,99,36,0.18)] bg-[#E8DCC4] p-0.5 sm:flex sm:w-auto">
          {REPORTS_PAGE_DATE_RANGE_OPTIONS.map((option) => {
            const isActive = option.value === range;

            return (
              <button
                key={option.value}
                type="button"
                aria-pressed={isActive}
                onClick={() => handleRangeChange(option.value)}
                className={`min-h-11 min-w-0 rounded-md px-2 py-2 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(201,164,77,0.35)] sm:shrink-0 sm:px-3 sm:py-1.5 md:min-h-9 ${
                  isActive
                    ? "bg-[#FFF9EA] text-[#17130E] shadow-[0_1px_3px_rgba(138,99,36,0.12)] ring-1 ring-[rgba(138,99,36,0.14)]"
                    : "text-[#4F4638] hover:text-[#17130E]"
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm sm:px-4">
      <div className={`${adminSegmentedControlClass} flex-wrap`}>
        {REPORTS_PAGE_DATE_RANGE_OPTIONS.map((option) => {
          const isActive = option.value === range;

          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={isActive}
              onClick={() => handleRangeChange(option.value)}
              className={`${adminSegmentedItemClass} shrink-0 px-3 py-1.5 text-xs ${
                isActive ? adminSegmentedItemActiveClass : ""
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
