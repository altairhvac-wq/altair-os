import type { ReactNode } from "react";
import { masterPanelHeaderClass } from "@/shared/design-system/shell/tokens";

type ReportChartCardProps = {
  title: string;
  subtitle: string;
  children: ReactNode;
  emptyMessage?: string;
  hasData?: boolean;
  className?: string;
  chartHeightClassName?: string;
  compact?: boolean;
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
}: ReportChartCardProps) {
  return (
    <section className={`flex h-full flex-col overflow-hidden admin-card ${className}`}>
      <div
        className={`${masterPanelHeaderClass} px-4 sm:px-4 ${
          compact ? "py-2 sm:py-2.5" : "py-2.5 sm:py-3"
        }`}
      >
        <h3 className="admin-heading-section text-[13px] sm:text-sm">{title}</h3>
        <p className="admin-text-helper mt-0.5 text-[11px] sm:text-xs">{subtitle}</p>
      </div>

      <div
        className={`flex flex-col p-3 sm:p-4 ${chartHeightClassName}`}
      >
        {!hasData && emptyMessage ? (
          <div className="flex items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50/60 px-4 py-6 text-center">
            <p className="max-w-sm text-xs text-slate-500 sm:text-sm">{emptyMessage}</p>
          </div>
        ) : (
          children
        )}
      </div>
    </section>
  );
}
