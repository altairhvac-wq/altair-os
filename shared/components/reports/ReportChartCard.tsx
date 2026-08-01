import type { ReactNode } from "react";
import {
  altairReportCardClass,
  altairReportCardPadTier1Class,
  altairReportCardPadTier2Class,
  altairReportCardPadTier3Class,
} from "@/shared/design-system/components";
import { masterPanelHeaderClass } from "@/shared/design-system/shell/tokens";
import {
  isNorthStarReportSurface,
  type ReportSurfaceVariant,
} from "./report-surface-variant";

type ReportChartDensity = "tier1" | "tier2" | "tier3";

type ReportChartCardProps = {
  title: string;
  subtitle: string;
  children: ReactNode;
  emptyMessage?: string;
  hasData?: boolean;
  className?: string;
  chartHeightClassName?: string;
  compact?: boolean;
  density?: ReportChartDensity;
  variant?: ReportSurfaceVariant;
};

function resolvePadClass(density: ReportChartDensity): string {
  switch (density) {
    case "tier2":
      return altairReportCardPadTier2Class;
    case "tier3":
      return altairReportCardPadTier3Class;
    case "tier1":
    default:
      return altairReportCardPadTier1Class;
  }
}

export function ReportChartCard({
  title,
  subtitle,
  children,
  emptyMessage,
  hasData = true,
  className = "",
  chartHeightClassName = "",
  compact = false,
  density = "tier1",
  variant = "legacy",
}: ReportChartCardProps) {
  const northStar = isNorthStarReportSurface(variant);
  const headerPadding = compact || density !== "tier1" ? "pb-2" : "pb-3";
  const titleClass =
    density === "tier1"
      ? "text-sm font-bold text-altair-paper"
      : "text-[13px] font-bold text-altair-paper";
  const subtitleClass =
    density === "tier3"
      ? "mt-0.5 text-[11px] text-altair-ink-muted"
      : "mt-0.5 text-xs text-altair-ink-muted";

  if (northStar) {
    return (
      <section
        className={`${altairReportCardClass} flex h-full flex-col overflow-hidden ${className}`}
      >
        <div className={`${resolvePadClass(density)} flex flex-1 flex-col`}>
          <div className={headerPadding}>
            <h3 className={titleClass}>{title}</h3>
            <p className={subtitleClass}>{subtitle}</p>
          </div>

          <div className={`flex flex-1 flex-col ${chartHeightClassName}`}>
            {!hasData && emptyMessage ? (
              <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-altair-border bg-white/[0.03] px-4 py-6 text-center">
                <p className="max-w-sm text-xs text-altair-ink-muted sm:text-sm">
                  {emptyMessage}
                </p>
              </div>
            ) : (
              children
            )}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section
      className={`altair-surface-card flex h-full flex-col overflow-hidden ${className}`}
    >
      <div className={`${masterPanelHeaderClass} px-4 sm:px-4 ${compact ? "py-2 sm:py-2.5" : "py-2.5 sm:py-3"}`}>
        <h3 className="admin-heading-section text-[13px] sm:text-sm">{title}</h3>
        <p className="admin-text-helper mt-0.5 text-[11px] sm:text-xs">{subtitle}</p>
      </div>

      <div className={`flex flex-col p-3 sm:p-4 ${chartHeightClassName}`}>
        {!hasData && emptyMessage ? (
          <div className="flex items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50/60 px-4 py-6 text-center">
            <p className="max-w-sm text-xs text-slate-500 sm:text-sm">
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
