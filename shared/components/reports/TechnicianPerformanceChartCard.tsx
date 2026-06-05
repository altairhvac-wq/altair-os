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

function SingleTechnicianLeaderboard({
  technician,
}: {
  technician: ReportTechnicianMetric;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
          Top Technician
        </p>
        <p className="mt-1 text-base font-bold text-slate-900">{technician.name}</p>
      </div>

      <div className="grid grid-cols-2 gap-3 rounded-lg border border-slate-100 bg-slate-50/50 px-3 py-2.5">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
            Completed jobs
          </p>
          <p className="mt-0.5 text-sm font-bold text-slate-900">
            {technician.completedJobs}
          </p>
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
            Revenue
          </p>
          <p className="mt-0.5 text-sm font-bold text-slate-900">
            {formatCurrency(technician.revenue)}
          </p>
        </div>
      </div>
    </div>
  );
}

export function TechnicianPerformanceChartCard({
  technicians,
}: TechnicianPerformanceChartCardProps) {
  const hasData = hasTechnicianData(technicians);

  if (technicians.length === 1) {
    return (
      <ReportChartCard
        title="Technician Performance"
        subtitle="Completed jobs and revenue by technician."
        hasData={hasData}
        emptyMessage="Technician performance appears once jobs are completed."
        compact
      >
        <SingleTechnicianLeaderboard technician={technicians[0]} />
      </ReportChartCard>
    );
  }

  const maxJobs = Math.max(
    ...technicians.map((technician) => technician.completedJobs),
    1,
  );

  return (
    <ReportChartCard
      title="Technician Performance"
      subtitle="Completed jobs and revenue by technician."
      hasData={hasData}
      emptyMessage="Technician performance appears once jobs are completed."
      compact
    >
      <div className="flex flex-col gap-2.5">
        {technicians.map((technician) => {
          const widthPercent = Math.max(
            (technician.completedJobs / maxJobs) * 100,
            6,
          );

          return (
            <div key={technician.technicianId} className="space-y-1">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold text-slate-800 sm:text-[13px]">
                    {technician.name}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    {technician.completedJobs} completed
                    {technician.revenue > 0
                      ? ` · ${formatCurrency(technician.revenue)}`
                      : ""}
                  </p>
                </div>
                <span className="shrink-0 text-xs font-bold tabular-nums text-slate-900 sm:text-sm">
                  {technician.completedJobs}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-violet-500/90"
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
