import { formatCurrency } from "@/shared/types/customer";
import type { ReportCashHealth } from "@/shared/types/reports-page";
import { ReportChartCard } from "./ReportChartCard";

type CashHealthChartCardProps = {
  data: ReportCashHealth;
};

function hasCashData(data: ReportCashHealth): boolean {
  return data.paid > 0 || data.outstanding > 0 || data.overdue > 0;
}

export function CashHealthChartCard({ data }: CashHealthChartCardProps) {
  const items = [
    {
      key: "paid",
      label: "Paid",
      value: data.paid,
      barClass: "bg-emerald-500",
      textClass: "text-emerald-700",
    },
    {
      key: "outstanding",
      label: "Outstanding",
      value: data.outstanding,
      barClass: "bg-amber-400",
      textClass: "text-amber-700",
    },
    {
      key: "overdue",
      label: "Overdue",
      value: data.overdue,
      barClass: "bg-rose-500",
      textClass: "text-rose-700",
    },
  ];

  const total = items.reduce((sum, item) => sum + item.value, 0);
  const hasData = hasCashData(data);

  return (
    <ReportChartCard
      title="Cash Health"
      subtitle="Invoice collection status for the period."
      hasData={hasData}
      emptyMessage="Invoice health will appear once invoices are created."
      compact
    >
      <div className="flex flex-col gap-3">
        {total > 0 ? (
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
        ) : null}

        <div className="divide-y divide-slate-100">
          {items.map((item) => (
            <div
              key={item.key}
              className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0"
            >
              <span className="text-xs font-medium text-slate-600">{item.label}</span>
              <span className={`text-sm font-bold tabular-nums ${item.textClass}`}>
                {formatCurrency(item.value)}
              </span>
            </div>
          ))}
          <div className="flex items-center justify-between gap-3 py-2.5">
            <span className="text-xs font-medium text-slate-600">Collection Rate</span>
            <span className="text-sm font-bold tabular-nums text-slate-900">
              {data.collectionRateLabel}
            </span>
          </div>
        </div>
      </div>
    </ReportChartCard>
  );
}
