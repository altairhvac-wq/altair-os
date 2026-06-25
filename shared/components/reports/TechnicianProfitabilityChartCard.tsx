import { formatCurrency } from "@/shared/types/customer";
import { formatPercent } from "@/shared/types/analytics";
import type { ReportTechnicianProfitability } from "@/shared/types/reports-page";
import { nsReportChart as ns } from "./north-star-chart-styles";
import { ReportChartCard } from "./ReportChartCard";
import {
  isNorthStarReportSurface,
  type ReportSurfaceVariant,
} from "./report-surface-variant";

type TechnicianProfitabilityChartCardProps = {
  technicians: ReportTechnicianProfitability[];
  variant?: ReportSurfaceVariant;
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
  variant = "legacy",
}: {
  technician: ReportTechnicianProfitability;
  variant?: ReportSurfaceVariant;
}) {
  const northStar = isNorthStarReportSurface(variant);

  return (
    <div className="flex flex-col gap-3">
      <div>
        <p
          className={
            northStar
              ? "text-[11px] font-semibold uppercase tracking-wide text-[#4F4638]"
              : "text-[11px] font-semibold uppercase tracking-wide text-slate-500"
          }
        >
          Top Technician
        </p>
        <p
          className={
            northStar
              ? "mt-1 text-base font-bold text-[#17130E]"
              : "mt-1 text-base font-bold text-slate-900"
          }
        >
          {technician.name}
        </p>
      </div>

      <div
        className={
          northStar
            ? "grid grid-cols-2 gap-3 rounded-lg border border-[rgba(138,99,36,0.10)] bg-[#FFF9EA]/80 px-3.5 py-3 sm:grid-cols-3"
            : "grid grid-cols-2 gap-2.5 rounded-lg border border-slate-100 bg-slate-50/50 px-3 py-2.5 sm:grid-cols-3"
        }
      >
        <div>
          <p
            className={
              northStar
                ? "text-[10px] font-semibold uppercase tracking-wide text-[#4F4638]"
                : "text-[10px] font-semibold uppercase tracking-wide text-slate-400"
            }
          >
            Revenue
          </p>
          <p
            className={
              northStar
                ? "mt-1 text-base font-extrabold tabular-nums tracking-tight text-[#17130E]"
                : "mt-0.5 text-sm font-bold text-slate-900"
            }
          >
            {formatCurrency(technician.revenue)}
          </p>
        </div>
        <div>
          <p
            className={
              northStar
                ? "text-[10px] font-semibold uppercase tracking-wide text-[#4F4638]"
                : "text-[10px] font-semibold uppercase tracking-wide text-slate-400"
            }
          >
            Labor
          </p>
          <p
            className={
              northStar
                ? "mt-0.5 text-sm font-bold text-[#17130E]"
                : "mt-0.5 text-sm font-bold text-slate-900"
            }
          >
            {formatLaborHours(technician.laborHours)}
          </p>
        </div>
        {technician.profitAvailable && technician.laborCost != null ? (
          <>
            <div>
              <p
                className={
                  northStar
                    ? "text-[10px] font-semibold uppercase tracking-wide text-[#4F4638]"
                    : "text-[10px] font-semibold uppercase tracking-wide text-slate-400"
                }
              >
                Labor Cost
              </p>
              <p
                className={
                  northStar
                    ? "mt-0.5 text-sm font-bold text-[#17130E]"
                    : "mt-0.5 text-sm font-bold text-slate-900"
                }
              >
                {formatCurrency(technician.laborCost)}
              </p>
            </div>
            <div>
              <p
                className={
                  northStar
                    ? "text-[10px] font-semibold uppercase tracking-wide text-[#4F4638]"
                    : "text-[10px] font-semibold uppercase tracking-wide text-slate-400"
                }
              >
                Gross Profit
              </p>
              <p
                className={
                  northStar
                    ? "mt-1 text-base font-extrabold tabular-nums tracking-tight text-[#3D5A40]"
                    : "mt-0.5 text-sm font-bold text-emerald-700"
                }
              >
                {formatCurrency(technician.grossProfit ?? 0)}
              </p>
            </div>
            <div>
              <p
                className={
                  northStar
                    ? "text-[10px] font-semibold uppercase tracking-wide text-[#4F4638]"
                    : "text-[10px] font-semibold uppercase tracking-wide text-slate-400"
                }
              >
                Margin
              </p>
              <p
                className={
                  northStar
                    ? "mt-0.5 text-sm font-bold text-[#17130E]"
                    : "mt-0.5 text-sm font-bold text-slate-900"
                }
              >
                {technician.margin != null ? formatPercent(technician.margin, 0) : "—"}
              </p>
            </div>
          </>
        ) : (
          <div className="col-span-2 sm:col-span-3">
            <p
              className={
                northStar
                  ? "text-[10px] font-semibold uppercase tracking-wide text-[#4F4638]"
                  : "text-[10px] font-semibold uppercase tracking-wide text-slate-400"
              }
            >
              Gross Profit
            </p>
            <p
              className={
                northStar
                  ? "mt-0.5 text-sm font-bold text-[#64748B]"
                  : "mt-0.5 text-sm font-bold text-slate-500"
              }
            >
              —
            </p>
            <p
              className={
                northStar
                  ? "mt-1 text-[11px] leading-relaxed text-[#64748B]"
                  : "mt-1 text-[11px] leading-relaxed text-slate-500"
              }
            >
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
  variant = "legacy",
}: TechnicianProfitabilityChartCardProps) {
  const hasData = hasTechnicianData(technicians);
  const northStar = isNorthStarReportSurface(variant);

  if (technicians.length === 1) {
    return (
      <ReportChartCard
        title="Technician Profitability"
        subtitle="Estimated gross profit by technician for completed work."
        hasData={hasData}
        emptyMessage="Technician profitability appears once jobs and labor are recorded."
        compact
        variant={variant}
      >
        <SingleTechnicianProfile technician={technicians[0]} variant={variant} />
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
      variant={variant}
    >
      <div className={northStar ? "flex flex-col gap-3.5" : "flex flex-col gap-2.5"}>
        {technicians.map((technician) => {
          const barValue =
            technician.profitAvailable && technician.grossProfit != null
              ? technician.grossProfit
              : technician.revenue;
          const widthPercent = Math.max((barValue / maxBarValue) * 100, 6);
          const barFillClass = technician.profitAvailable
            ? northStar
              ? ns.techProfitBar
              : "bg-emerald-500/90"
            : northStar
              ? ns.techRevenueBar
              : "bg-violet-500/90";

          return (
            <div
              key={technician.technicianId}
              className={
                northStar
                  ? "space-y-1.5 rounded-lg border border-[rgba(138,99,36,0.08)] bg-[#FFF9EA]/35 px-3 py-2.5"
                  : "space-y-1"
              }
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p
                    className={
                      northStar
                        ? "truncate text-[13px] font-semibold text-[#17130E]"
                        : "truncate text-xs font-semibold text-slate-800 sm:text-[13px]"
                    }
                  >
                    {technician.name}
                  </p>
                  <p
                    className={
                      northStar
                        ? "mt-0.5 text-[11px] leading-relaxed text-[#64748B]"
                        : "text-[11px] text-slate-500"
                    }
                  >
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
                <span
                  className={
                    northStar
                      ? "shrink-0 text-sm font-extrabold tabular-nums tracking-tight text-[#17130E]"
                      : "shrink-0 text-xs font-bold tabular-nums text-slate-900 sm:text-sm"
                  }
                >
                  {technician.profitAvailable && technician.grossProfit != null
                    ? formatCurrency(technician.grossProfit)
                    : formatCurrency(technician.revenue)}
                </span>
              </div>
              <div
                className={
                  northStar
                    ? `${ns.techBar} ${ns.track}`
                    : "h-1.5 overflow-hidden rounded-full bg-slate-100"
                }
              >
                <div
                  className={
                    northStar
                      ? `${ns.techBarFill} ${barFillClass}`
                      : `h-full rounded-full ${barFillClass}`
                  }
                  style={{ width: `${widthPercent}%` }}
                />
              </div>
            </div>
          );
        })}
        {technicians.some((technician) => !technician.profitAvailable) ? (
          <p
            className={
              northStar
                ? "text-[11px] leading-relaxed text-[#64748B]"
                : "text-[11px] leading-relaxed text-slate-500"
            }
          >
            Add technician labor cost rates to unlock profitability.
          </p>
        ) : null}
      </div>
    </ReportChartCard>
  );
}
