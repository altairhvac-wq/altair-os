"use client";

import { useRouter, useSearchParams } from "next/navigation";
import {
  altairReportCardClass,
  altairReportCardPadClass,
  altairReportRangeItemActiveClass,
  altairReportRangeItemClass,
  altairReportRangeItemIdleClass,
  altairReportRangeTrackClass,
} from "@/shared/design-system/components";
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

const COMPACT_RANGE_LABELS: Record<ReportsPageDateRange, string> = {
  "7d": "7d",
  "30d": "30d",
  "90d": "90d",
  ytd: "YTD",
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
      <div
        className={`min-w-0 ${altairReportCardClass} ${altairReportCardPadClass}`}
      >
        <div
          role="group"
          aria-label="Report date range"
          className={altairReportRangeTrackClass}
        >
          {REPORTS_PAGE_DATE_RANGE_OPTIONS.map((option) => {
            const isActive = option.value === range;

            return (
              <button
                key={option.value}
                type="button"
                aria-pressed={isActive}
                aria-label={option.label}
                title={option.label}
                onClick={() => handleRangeChange(option.value)}
                className={`${altairReportRangeItemClass} ${
                  isActive
                    ? altairReportRangeItemActiveClass
                    : altairReportRangeItemIdleClass
                }`}
              >
                {COMPACT_RANGE_LABELS[option.value]}
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
