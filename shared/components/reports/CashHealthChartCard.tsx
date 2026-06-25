import { formatCurrency } from "@/shared/types/customer";
import type { ReportCashHealth } from "@/shared/types/reports-page";
import { nsReportChart as ns } from "./north-star-chart-styles";
import { ReportChartCard } from "./ReportChartCard";
import {
  isNorthStarReportSurface,
  type ReportSurfaceVariant,
} from "./report-surface-variant";

type CashHealthChartCardProps = {
  data: ReportCashHealth;
  variant?: ReportSurfaceVariant;
};

function hasCashData(data: ReportCashHealth): boolean {
  return data.paid > 0 || data.outstanding > 0 || data.overdue > 0;
}

const LEGACY_ITEMS = [
  {
    key: "paid",
    label: "Paid",
    barClass: "bg-emerald-500",
    textClass: "text-emerald-700",
  },
  {
    key: "outstanding",
    label: "Outstanding",
    barClass: "bg-amber-400",
    textClass: "text-amber-700",
  },
  {
    key: "overdue",
    label: "Overdue",
    barClass: "bg-rose-500",
    textClass: "text-rose-700",
  },
] as const;

export function CashHealthChartCard({
  data,
  variant = "legacy",
}: CashHealthChartCardProps) {
  const northStar = isNorthStarReportSurface(variant);

  const items = northStar
    ? [
        {
          key: "paid",
          label: "Paid",
          value: data.paid,
          barClass: ns.cashHealth.paid.bar,
          dotClass: ns.cashHealth.paid.dot,
          textClass: ns.cashHealth.paid.text,
        },
        {
          key: "outstanding",
          label: "Outstanding",
          value: data.outstanding,
          barClass: ns.cashHealth.outstanding.bar,
          dotClass: ns.cashHealth.outstanding.dot,
          textClass: ns.cashHealth.outstanding.text,
        },
        {
          key: "overdue",
          label: "Overdue",
          value: data.overdue,
          barClass: ns.cashHealth.overdue.bar,
          dotClass: ns.cashHealth.overdue.dot,
          textClass: ns.cashHealth.overdue.text,
        },
      ]
    : LEGACY_ITEMS.map((item) => ({
        ...item,
        value: data[item.key as keyof ReportCashHealth] as number,
        dotClass: "",
      }));

  const total = items.reduce((sum, item) => sum + item.value, 0);
  const hasData = hasCashData(data);

  return (
    <ReportChartCard
      title="Cash Health"
      subtitle="Invoice collection status for the period."
      hasData={hasData}
      emptyMessage="Invoice health will appear once invoices are created."
      compact
      variant={variant}
    >
      <div className={northStar ? "flex flex-col gap-4" : "flex flex-col gap-3"}>
        {total > 0 ? (
          northStar ? (
            <div className="space-y-2">
              <div className={ns.trackSegmented} aria-hidden="true">
                {items.map((item) => {
                  const widthPercent = (item.value / total) * 100;
                  if (widthPercent <= 0) {
                    return null;
                  }

                  return (
                    <div
                      key={item.key}
                      className={`${item.barClass} min-w-[3px] rounded-sm transition-all`}
                      style={{ width: `${widthPercent}%` }}
                    />
                  );
                })}
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1.5">
                {items.map((item) => {
                  if (item.value <= 0) {
                    return null;
                  }

                  return (
                    <span
                      key={item.key}
                      className="inline-flex items-center gap-1.5 text-[10px] font-medium text-[#64748B]"
                    >
                      <span
                        className={`h-1.5 w-1.5 shrink-0 rounded-full ${item.dotClass}`}
                        aria-hidden="true"
                      />
                      {item.label}
                    </span>
                  );
                })}
              </div>
            </div>
          ) : (
            <div
              className="flex h-1.5 overflow-hidden rounded-full bg-slate-100"
              aria-hidden="true"
            >
              {items.map((item) => {
                const widthPercent = (item.value / total) * 100;
                if (widthPercent <= 0) {
                  return null;
                }

                return (
                  <div
                    key={item.key}
                    className={`${item.barClass} transition-all`}
                    style={{ width: `${widthPercent}%` }}
                  />
                );
              })}
            </div>
          )
        ) : null}

        <div
          className={
            northStar
              ? "divide-y divide-[rgba(138,99,36,0.10)] rounded-lg border border-[rgba(138,99,36,0.08)] bg-[#FFF9EA]/40 px-3"
              : "divide-y divide-slate-100"
          }
        >
          {items.map((item) => (
            <div
              key={item.key}
              className={
                northStar
                  ? "flex items-center justify-between gap-3 py-3 first:pt-3 last:pb-3"
                  : "flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0"
              }
            >
              <span
                className={
                  northStar
                    ? "inline-flex items-center gap-2 text-xs font-medium text-[#4F4638]"
                    : "text-xs font-medium text-slate-600"
                }
              >
                {northStar ? (
                  <span
                    className={`h-2 w-2 shrink-0 rounded-full ${item.dotClass}`}
                    aria-hidden="true"
                  />
                ) : null}
                {item.label}
              </span>
              <span className={`text-sm font-bold tabular-nums ${item.textClass}`}>
                {formatCurrency(item.value)}
              </span>
            </div>
          ))}
          <div
            className={
              northStar
                ? "flex items-center justify-between gap-3 border-t border-[rgba(138,99,36,0.10)] py-3"
                : "flex items-center justify-between gap-3 py-2.5"
            }
          >
            <span
              className={
                northStar
                  ? "text-xs font-semibold text-[#4F4638]"
                  : "text-xs font-medium text-slate-600"
              }
            >
              Collection Rate
            </span>
            <span
              className={
                northStar
                  ? "text-base font-extrabold tabular-nums tracking-tight text-[#17130E]"
                  : "text-sm font-bold tabular-nums text-slate-900"
              }
            >
              {data.collectionRateLabel}
            </span>
          </div>
        </div>
      </div>
    </ReportChartCard>
  );
}
