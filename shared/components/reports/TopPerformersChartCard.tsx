import {
  altairReportCardClass,
  altairReportCardPadTier2Class,
} from "@/shared/design-system/components";
import { formatCurrency } from "@/shared/types/customer";
import { formatPercent } from "@/shared/types/analytics";
import type { ReportTechnicianProfitability } from "@/shared/types/reports-page";
import { getTeamMemberInitials } from "@/shared/types/team-member";
import {
  isNorthStarReportSurface,
  type ReportSurfaceVariant,
} from "./report-surface-variant";

type TopPerformersChartCardProps = {
  technicians: ReportTechnicianProfitability[];
  variant?: ReportSurfaceVariant;
};

function hasTechnicianData(technicians: ReportTechnicianProfitability[]): boolean {
  return technicians.some(
    (technician) => technician.revenue > 0 || technician.laborHours > 0,
  );
}

function formatJobCount(count: number): string {
  return `${count} job${count === 1 ? "" : "s"}`;
}

function TechnicianAvatar({
  name,
  northStar,
}: {
  name: string;
  northStar: boolean;
}) {
  return (
    <span
      className={
        northStar
          ? "flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/[0.08] text-[10px] font-semibold text-altair-paper"
          : "flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-200 text-[10px] font-semibold text-slate-700"
      }
      aria-hidden="true"
    >
      {getTeamMemberInitials(name)}
    </span>
  );
}

export function TopPerformersChartCard({
  technicians,
  variant = "legacy",
}: TopPerformersChartCardProps) {
  const northStar = isNorthStarReportSurface(variant);
  const ranked = [...technicians]
    .sort((left, right) => right.revenue - left.revenue)
    .slice(0, 5);
  const hasData = hasTechnicianData(ranked);

  if (northStar) {
    return (
      <div className={`${altairReportCardClass} ${altairReportCardPadTier2Class}`}>
        {!hasData ? (
          <div className="flex items-center justify-center rounded-lg border border-dashed border-altair-border bg-white/[0.03] px-4 py-6 text-center">
            <p className="max-w-sm text-xs text-altair-ink-on-graphite-muted sm:text-sm">
              Technician performance appears once jobs and labor are recorded.
            </p>
          </div>
        ) : (
          <ol className="flex flex-col gap-2">
            {ranked.map((technician, index) => (
              <li
                key={technician.technicianId}
                className="flex items-start gap-3 rounded-lg border border-altair-border bg-white/[0.04] px-3 py-2.5"
              >
                <span className="mt-1.5 w-4 shrink-0 text-center text-xs font-bold tabular-nums text-altair-ink-on-graphite-muted">
                  {index + 1}
                </span>

                <TechnicianAvatar name={technician.name} northStar />

                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-semibold text-altair-paper">
                        {technician.name}
                      </p>
                      <p className="mt-0.5 text-[11px] text-altair-ink-on-graphite-muted">
                        {formatJobCount(technician.jobCount)}
                      </p>
                    </div>
                    <span className="shrink-0 text-sm font-extrabold tabular-nums tracking-tight text-altair-paper">
                      {formatCurrency(technician.revenue)}
                    </span>
                  </div>

                  {technician.profitAvailable &&
                  technician.grossProfit != null ? (
                    <p className="mt-1 text-[11px] tabular-nums text-altair-ink-on-graphite-muted">
                      <span className="font-semibold text-emerald-300">
                        {formatCurrency(technician.grossProfit)} profit
                      </span>
                      {technician.margin != null
                        ? ` · ${formatPercent(technician.margin, 0)} margin`
                        : ""}
                    </p>
                  ) : (
                    <p className="mt-1 text-[11px] leading-relaxed text-altair-ink-on-graphite-muted">
                      Add labor cost rates to unlock profit reporting.
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>
    );
  }

  return (
    <section className="altair-surface-card overflow-hidden">
      <div className="border-b border-slate-100 px-4 py-2.5">
        <h3 className="admin-heading-section text-[13px] sm:text-sm">
          Top Performers
        </h3>
        <p className="admin-text-helper mt-0.5 text-[11px] sm:text-xs">
          Technicians ranked by revenue on completed work.
        </p>
      </div>
      <div className="p-3 sm:p-4">
        {!hasData ? (
          <div className="flex items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50/60 px-4 py-6 text-center">
            <p className="max-w-sm text-xs text-slate-500 sm:text-sm">
              Technician performance appears once jobs and labor are recorded.
            </p>
          </div>
        ) : (
          <ol className="flex flex-col gap-2">
            {ranked.map((technician, index) => (
              <li
                key={technician.technicianId}
                className="flex items-start gap-3 rounded-lg border border-slate-100 bg-slate-50/50 px-3 py-2.5"
              >
                <span className="mt-1.5 w-4 shrink-0 text-center text-xs font-bold tabular-nums text-slate-400">
                  {index + 1}
                </span>
                <TechnicianAvatar name={technician.name} northStar={false} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-semibold text-slate-900">
                        {technician.name}
                      </p>
                      <p className="mt-0.5 text-[11px] text-slate-500">
                        {formatJobCount(technician.jobCount)}
                      </p>
                    </div>
                    <span className="shrink-0 text-sm font-bold tabular-nums text-slate-900">
                      {formatCurrency(technician.revenue)}
                    </span>
                  </div>
                  {technician.profitAvailable &&
                  technician.grossProfit != null ? (
                    <p className="mt-1 text-[11px] tabular-nums text-slate-500">
                      <span className="font-semibold text-emerald-700">
                        {formatCurrency(technician.grossProfit)} profit
                      </span>
                      {technician.margin != null
                        ? ` · ${formatPercent(technician.margin, 0)} margin`
                        : ""}
                    </p>
                  ) : (
                    <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
                      Add labor cost rates to unlock profit reporting.
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>
    </section>
  );
}
