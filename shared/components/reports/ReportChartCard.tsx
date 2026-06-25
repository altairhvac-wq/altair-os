import type { ReactNode } from "react";
import { masterPanelHeaderClass } from "@/shared/design-system/shell/tokens";
import {
  isNorthStarReportSurface,
  type ReportSurfaceVariant,
} from "./report-surface-variant";

type ReportChartCardProps = {
  title: string;
  subtitle: string;
  children: ReactNode;
  emptyMessage?: string;
  hasData?: boolean;
  className?: string;
  chartHeightClassName?: string;
  compact?: boolean;
  variant?: ReportSurfaceVariant;
};

export function ReportChartCard({
  title,
  subtitle,
  children,
  emptyMessage,
  hasData = true,
  className = "",
  chartHeightClassName = "",
  compact = false,
  variant = "legacy",
}: ReportChartCardProps) {
  const northStar = isNorthStarReportSurface(variant);
  const headerPadding = compact ? "py-2 sm:py-2.5" : "py-2.5 sm:py-3";

  return (
    <section
      className={
        northStar
          ? `flex h-full flex-col overflow-hidden rounded-[1.25rem] border border-[rgba(138,99,36,0.12)] bg-[#FBF7EF] shadow-[0_4px_16px_rgba(3,7,12,0.08)] ${className}`
          : `flex h-full flex-col overflow-hidden admin-card ${className}`
      }
    >
      <div
        className={
          northStar
            ? `border-b border-[rgba(138,99,36,0.12)] bg-[#FFF9EA] px-4 sm:px-4 ${headerPadding}`
            : `${masterPanelHeaderClass} px-4 sm:px-4 ${headerPadding}`
        }
      >
        <h3
          className={
            northStar
              ? "text-sm font-bold text-[#17130E]"
              : "admin-heading-section text-[13px] sm:text-sm"
          }
        >
          {title}
        </h3>
        <p
          className={
            northStar
              ? "mt-0.5 text-xs text-[#64748B]"
              : "admin-text-helper mt-0.5 text-[11px] sm:text-xs"
          }
        >
          {subtitle}
        </p>
      </div>

      <div className={`flex flex-col ${northStar ? "p-3.5 sm:p-4" : "p-3 sm:p-4"} ${chartHeightClassName}`}>
        {!hasData && emptyMessage ? (
          <div
            className={
              northStar
                ? "flex items-center justify-center rounded-lg border border-dashed border-[rgba(138,99,36,0.22)] bg-[#FFF9EA] px-4 py-6 text-center"
                : "flex items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50/60 px-4 py-6 text-center"
            }
          >
            <p
              className={
                northStar
                  ? "max-w-sm text-xs text-[#64748B] sm:text-sm"
                  : "max-w-sm text-xs text-slate-500 sm:text-sm"
              }
            >
              {emptyMessage}
            </p>
          </div>
        ) : (
          children
        )}
      </div>
    </section>
  );
}
