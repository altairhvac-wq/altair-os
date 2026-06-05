import type { ReportFunnelStage } from "@/shared/types/reports-page";
import { ReportChartCard } from "./ReportChartCard";

type SalesFunnelChartCardProps = {
  stages: ReportFunnelStage[];
};

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
    >
      <div className="flex flex-col gap-4">
        {stages.map((stage, index) => {
          const widthPercent = Math.max((stage.count / maxCount) * 100, 6);

          return (
            <div key={stage.key} className="space-y-1.5">
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="font-medium text-slate-700">{stage.label}</span>
                <span className="font-bold text-slate-900">{stage.count}</span>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                <div
                  className={`h-full rounded-full ${
                    index === 0
                      ? "bg-cyan-500"
                      : index === 1
                        ? "bg-emerald-500"
                        : index === 2
                          ? "bg-indigo-500"
                          : "bg-slate-700"
                  }`}
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
