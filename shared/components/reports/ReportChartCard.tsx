import type { ReactNode } from "react";

type ReportChartCardProps = {
  title: string;
  subtitle: string;
  children: ReactNode;
  emptyMessage?: string;
  hasData?: boolean;
  className?: string;
  chartHeightClassName?: string;
};

export function ReportChartCard({
  title,
  subtitle,
  children,
  emptyMessage,
  hasData = true,
  className = "",
  chartHeightClassName = "min-h-[280px] sm:min-h-[320px]",
}: ReportChartCardProps) {
  return (
    <section className={`flex h-full flex-col overflow-hidden admin-card ${className}`}>
      <div className="admin-panel-header px-4 py-3 sm:px-5 sm:py-4">
        <h3 className="admin-heading-section sm:text-base">{title}</h3>
        <p className="admin-text-helper mt-0.5">{subtitle}</p>
      </div>

      <div className={`flex flex-1 flex-col p-4 sm:p-5 ${chartHeightClassName}`}>
        {!hasData && emptyMessage ? (
          <div className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-4 py-10 text-center">
            <p className="max-w-sm text-sm text-slate-500">{emptyMessage}</p>
          </div>
        ) : (
          children
        )}
      </div>
    </section>
  );
}
