import { formatCurrency } from "@/shared/types/customer";
import type { ReportTechnicianMetric } from "@/shared/types/reports-page";
import { ReportChartCard } from "./ReportChartCard";

type TechnicianPerformanceChartCardProps = {
  technicians: ReportTechnicianMetric[];
};

function hasTechnicianData(technicians: ReportTechnicianMetric[]): boolean {
  return technicians.some(
    (technician) => technician.completedJobs > 0 || technician.revenue > 0,
  );
}

export function TechnicianPerformanceChartCard({
  technicians,
}: TechnicianPerformanceChartCardProps) {
  const maxJobs = Math.max(
    ...technicians.map((technician) => technician.completedJobs),
    1,
  );
  const hasData = hasTechnicianData(technicians);

  return (
    <ReportChartCard
      title="Technician Performance"
      subtitle="Completed jobs and revenue by technician."
      hasData={hasData}
      emptyMessage="Technician performance appears once jobs are completed."
    >
      <div className="flex flex-col gap-4">
        {technicians.map((technician) => {
          const widthPercent = Math.max(
            (technician.completedJobs / maxJobs) * 100,
            8,
          );

          return (
            <div key={technician.technicianId} className="space-y-1.5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-800">
                    {technician.name}
                  </p>
                  <p className="text-xs text-slate-500">
                    {technician.completedJobs} completed
                    {technician.revenue > 0
                      ? ` · ${formatCurrency(technician.revenue)}`
                      : ""}
                  </p>
                </div>
                <span className="shrink-0 text-sm font-bold text-slate-900">
                  {technician.completedJobs}
                </span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-violet-500"
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
