import type { ReportFunnelStage } from "@/shared/types/reports-page";
import { ReportChartCard } from "./ReportChartCard";

type SalesFunnelChartCardProps = {
  stages: ReportFunnelStage[];
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

export function SalesFunnelChartCard({ stages }: SalesFunnelChartCardProps) {
  const maxCount = Math.max(...stages.map((stage) => stage.count), 1);
  const hasData = hasFunnelData(stages);

  return (
    <ReportChartCard
      title="Sales Funnel"
      subtitle="Estimate flow from sent to approved to paid."
      hasData={hasData}
      emptyMessage="Estimate conversion appears once estimates are sent and approved."
      compact
    >
      <div className="flex flex-col gap-2.5">
        {stages.map((stage, index) => {
          const widthPercent = Math.max((stage.count / maxCount) * 100, 4);

          return (
            <div key={stage.key} className="space-y-1">
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-medium text-slate-700 sm:text-[13px]">
                  {stage.label}
                </span>
                <span className="text-xs font-bold tabular-nums text-slate-900 sm:text-sm">
                  {stage.count}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                <div
                  className={`h-full rounded-full ${STAGE_COLORS[index] ?? STAGE_COLORS[3]}`}
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
