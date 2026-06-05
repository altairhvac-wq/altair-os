import { formatCurrency } from "@/shared/types/customer";
import { formatPercent } from "@/shared/types/analytics";
import type { ReportTechnicianProfitability } from "@/shared/types/reports-page";
import { ReportChartCard } from "./ReportChartCard";

type TechnicianProfitabilityChartCardProps = {
  technicians: ReportTechnicianProfitability[];
};

function hasTechnicianData(technicians: ReportTechnicianProfitability[]): boolean {
  return technicians.some(
    (technician) => technician.revenue > 0 || technician.laborHours > 0,
  );
}

function formatLaborHours(hours: number): string {
  if (hours <= 0) {
    return "0 hrs";
  }

  return `${hours} hrs`;
}

function SingleTechnicianProfile({
  technician,
}: {
  technician: ReportTechnicianProfitability;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
          Top Technician
        </p>
        <p className="mt-1 text-base font-bold text-slate-900">{technician.name}</p>
      </div>

      <div className="grid grid-cols-2 gap-2.5 rounded-lg border border-slate-100 bg-slate-50/50 px-3 py-2.5 sm:grid-cols-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
            Revenue
          </p>
          <p className="mt-0.5 text-sm font-bold text-slate-900">
            {formatCurrency(technician.revenue)}
          </p>
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
            Labor
          </p>
          <p className="mt-0.5 text-sm font-bold text-slate-900">
            {formatLaborHours(technician.laborHours)}
          </p>
        </div>
        {technician.profitAvailable && technician.laborCost != null ? (
          <>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                Labor Cost
              </p>
              <p className="mt-0.5 text-sm font-bold text-slate-900">
                {formatCurrency(technician.laborCost)}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                Gross Profit
              </p>
              <p className="mt-0.5 text-sm font-bold text-emerald-700">
                {formatCurrency(technician.grossProfit ?? 0)}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                Margin
              </p>
              <p className="mt-0.5 text-sm font-bold text-slate-900">
                {technician.margin != null ? formatPercent(technician.margin, 0) : "—"}
              </p>
            </div>
          </>
        ) : (
          <div className="col-span-2 sm:col-span-3">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
              Gross Profit
            </p>
            <p className="mt-0.5 text-sm font-bold text-slate-500">—</p>
            <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
              Add labor cost rates to unlock profit reporting.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export function TechnicianProfitabilityChartCard({
  technicians,
}: TechnicianProfitabilityChartCardProps) {
  const hasData = hasTechnicianData(technicians);

  if (technicians.length === 1) {
    return (
      <ReportChartCard
        title="Technician Profitability"
        subtitle="Estimated gross profit by technician for completed work."
        hasData={hasData}
        emptyMessage="Technician profitability appears once jobs and labor are recorded."
        compact
      >
        <SingleTechnicianProfile technician={technicians[0]} />
      </ReportChartCard>
    );
  }

  const maxBarValue = Math.max(
    ...technicians.map((technician) =>
      technician.profitAvailable && technician.grossProfit != null
        ? technician.grossProfit
        : technician.revenue,
    ),
    1,
  );

  return (
    <ReportChartCard
      title="Technician Profitability"
      subtitle="Estimated gross profit by technician for completed work."
      hasData={hasData}
      emptyMessage="Technician profitability appears once jobs and labor are recorded."
      compact
    >
      <div className="flex flex-col gap-2.5">
        {technicians.map((technician) => {
          const barValue =
            technician.profitAvailable && technician.grossProfit != null
              ? technician.grossProfit
              : technician.revenue;
          const widthPercent = Math.max((barValue / maxBarValue) * 100, 6);

          return (
            <div key={technician.technicianId} className="space-y-1">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold text-slate-800 sm:text-[13px]">
                    {technician.name}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    {formatCurrency(technician.revenue)} revenue
                    {technician.laborHours > 0
                      ? ` · ${formatLaborHours(technician.laborHours)}`
                      : ""}
                    {technician.profitAvailable && technician.grossProfit != null
                      ? ` · ${formatCurrency(technician.grossProfit)} profit`
                      : ""}
                    {technician.profitAvailable && technician.margin != null
                      ? ` · ${formatPercent(technician.margin, 0)} margin`
                      : ""}
                  </p>
                </div>
                <span className="shrink-0 text-xs font-bold tabular-nums text-slate-900 sm:text-sm">
                  {technician.profitAvailable && technician.grossProfit != null
                    ? formatCurrency(technician.grossProfit)
                    : formatCurrency(technician.revenue)}
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                <div
                  className={`h-full rounded-full ${
                    technician.profitAvailable ? "bg-emerald-500/90" : "bg-violet-500/90"
                  }`}
                  style={{ width: `${widthPercent}%` }}
                />
              </div>
            </div>
          );
        })}
        {technicians.some((technician) => !technician.profitAvailable) ? (
          <p className="text-[11px] leading-relaxed text-slate-500">
            Add technician labor cost rates to unlock profitability.
          </p>
        ) : null}
      </div>
    </ReportChartCard>
  );
}
