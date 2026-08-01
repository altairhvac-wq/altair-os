import {
  altairReportCardClass,
  altairReportCardPadTier2Class,
  altairReportMetricLabelClass,
  altairReportMetricMetaClass,
  altairReportMetricValueClass,
  altairReportTileClass,
} from "@/shared/design-system/components";
import type { ReportCustomerHealth } from "@/shared/types/reports-page";
import {
  isNorthStarReportSurface,
  type ReportSurfaceVariant,
} from "./report-surface-variant";

type CustomerHealthCardProps = {
  data: ReportCustomerHealth;
  variant?: ReportSurfaceVariant;
};

function hasCustomerHealthData(data: ReportCustomerHealth): boolean {
  return data.totalCustomerCount > 0 || data.lifetimeRevenueTotal > 0;
}

export function CustomerHealthCard({
  data,
  variant = "legacy",
}: CustomerHealthCardProps) {
  const northStar = isNorthStarReportSurface(variant);
  const hasData = hasCustomerHealthData(data);
  const repeatMeta =
    data.totalCustomerCount > 0
      ? `${data.repeatCustomerCount} of ${data.totalCustomerCount} customers`
      : "No customer records yet";

  if (northStar) {
    return (
      <div className={`${altairReportCardClass} ${altairReportCardPadTier2Class}`}>
        {!hasData ? (
          <div className="flex items-center justify-center rounded-lg border border-dashed border-altair-border bg-white/[0.03] px-4 py-6 text-center">
            <p className="max-w-sm text-xs text-altair-ink-muted sm:text-sm">
              Customer health appears once customers and payments are recorded.
            </p>
          </div>
        ) : (
          <div className="grid min-w-0 gap-2.5 sm:grid-cols-2">
            <div className={`${altairReportTileClass} p-3`}>
              <p className={altairReportMetricLabelClass}>Repeat customers</p>
              <p className={`mt-2 ${altairReportMetricValueClass}`}>
                {data.repeatCustomerRateLabel}
              </p>
              <p className={`mt-1.5 ${altairReportMetricMetaClass}`}>
                {repeatMeta}
              </p>
            </div>
            <div className={`${altairReportTileClass} p-3`}>
              <p className={altairReportMetricLabelClass}>
                Lifetime revenue (total)
              </p>
              <p className={`mt-2 ${altairReportMetricValueClass}`}>
                {data.lifetimeRevenueLabel}
              </p>
              <p className={`mt-1.5 ${altairReportMetricMetaClass}`}>
                All-time payments collected — not a CLV model
              </p>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <section className="altair-surface-card overflow-hidden">
      <div className="border-b border-slate-100 px-4 py-2.5">
        <h3 className="admin-heading-section text-[13px] sm:text-sm">
          Customer Health
        </h3>
        <p className="admin-text-helper mt-0.5 text-[11px] sm:text-xs">
          Retention and all-time payment totals.
        </p>
      </div>
      <div className="p-3 sm:p-4">
        {!hasData ? (
          <div className="flex items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50/60 px-4 py-6 text-center">
            <p className="max-w-sm text-xs text-slate-500 sm:text-sm">
              Customer health appears once customers and payments are recorded.
            </p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-slate-100 bg-slate-50/50 px-3 py-2.5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                Repeat customers
              </p>
              <p className="mt-1.5 text-xl font-extrabold tabular-nums tracking-tight text-slate-900">
                {data.repeatCustomerRateLabel}
              </p>
              <p className="mt-1 text-xs text-slate-500">{repeatMeta}</p>
            </div>
            <div className="rounded-lg border border-slate-100 bg-slate-50/50 px-3 py-2.5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                Lifetime revenue (total)
              </p>
              <p className="mt-1.5 text-xl font-extrabold tabular-nums tracking-tight text-slate-900">
                {data.lifetimeRevenueLabel}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                All-time payments collected — not a CLV model
              </p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
