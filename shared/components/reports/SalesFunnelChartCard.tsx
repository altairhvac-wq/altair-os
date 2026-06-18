import type { ReportFunnelStage } from "@/shared/types/reports-page";
import { nsReportChart as ns } from "./north-star-chart-styles";
import { ReportChartCard } from "./ReportChartCard";
import {
  isNorthStarReportSurface,
  type ReportSurfaceVariant,
} from "./report-surface-variant";

type SalesFunnelChartCardProps = {
  stages: ReportFunnelStage[];
  variant?: ReportSurfaceVariant;
};

const STAGE_COLORS = [
  "bg-cyan-500",
  "bg-emerald-500",
  "bg-indigo-500",
  "bg-slate-700",
];

function hasFunnelData(stages: ReportFunnelStage[]): boolean {
  return stages.some((stage) => stage.count > 0);
}

export function SalesFunnelChartCard({
  stages,
  variant = "legacy",
}: SalesFunnelChartCardProps) {
  const maxCount = Math.max(...stages.map((stage) => stage.count), 1);
  const hasData = hasFunnelData(stages);
  const northStar = isNorthStarReportSurface(variant);
  const stageColors = northStar ? ns.funnelStages : STAGE_COLORS;

  return (
    <ReportChartCard
      title="Sales Funnel"
      subtitle="Estimate flow from sent to approved to paid."
      hasData={hasData}
      emptyMessage="Estimate conversion appears once estimates are sent and approved."
      compact
      variant={variant}
    >
      <div className={northStar ? "flex flex-col gap-3.5" : "flex flex-col gap-2.5"}>
        {stages.map((stage, index) => {
          const widthPercent = Math.max((stage.count / maxCount) * 100, 4);
          const barColor = stageColors[index] ?? stageColors[3];

          return (
            <div key={stage.key} className={northStar ? "space-y-1.5" : "space-y-1"}>
              <div className="flex items-baseline justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2">
                  {northStar ? (
                    <span
                      className={`h-2 w-2 shrink-0 rounded-full ${barColor}`}
                      aria-hidden="true"
                    />
                  ) : null}
                  <span
                    className={
                      northStar
                        ? "truncate text-[13px] font-semibold text-[#17130E]"
                        : "text-xs font-medium text-slate-700 sm:text-[13px]"
                    }
                  >
                    {stage.label}
                  </span>
                </div>
                <span
                  className={
                    northStar
                      ? "shrink-0 text-sm font-extrabold tabular-nums tracking-tight text-[#17130E]"
                      : "text-xs font-bold tabular-nums text-slate-900 sm:text-sm"
                  }
                >
                  {stage.count}
                </span>
              </div>
              <div
                className={
                  northStar
                    ? `${ns.funnelBar} ${ns.track}`
                    : "h-2 overflow-hidden rounded-full bg-slate-100"
                }
              >
                <div
                  className={
                    northStar
                      ? `${ns.funnelBarFill} ${barColor}`
                      : `h-full rounded-full ${barColor}`
                  }
                  style={{ width: `${widthPercent}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </ReportChartCard>
  );
}
