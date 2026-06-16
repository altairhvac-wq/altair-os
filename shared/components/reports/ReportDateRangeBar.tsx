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

type ReportDateRangeBarProps = {
  range: ReportsPageDateRange;
};

export function ReportDateRangeBar({ range }: ReportDateRangeBarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleRangeChange = (nextRange: ReportsPageDateRange) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("range", nextRange);
    router.push(`/reports?${params.toString()}`);
  };

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
