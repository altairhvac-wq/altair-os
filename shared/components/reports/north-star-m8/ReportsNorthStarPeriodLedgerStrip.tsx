import Link from "next/link";
import { formatCurrency } from "@/shared/types/customer";
import type { AccountantSummaryData } from "@/shared/types/reports-page";
import { REPORTS_PAGE_DATE_RANGE_OPTIONS } from "@/shared/types/reports-page";

type ReportsNorthStarPeriodLedgerStripProps = {
  summary: AccountantSummaryData;
};

function formatPeriodLabel(dateRange: AccountantSummaryData["dateRange"]): string {
  return (
    REPORTS_PAGE_DATE_RANGE_OPTIONS.find((option) => option.value === dateRange)
      ?.label ?? "Selected period"
  );
}

export function ReportsNorthStarPeriodLedgerStrip({
  summary,
}: ReportsNorthStarPeriodLedgerStripProps) {
  const periodLabel = formatPeriodLabel(summary.dateRange);
  const taxSummaryHref = `/reports/tax-summary?range=${summary.dateRange}`;

  const metrics = [
    {
      id: "collected",
      label: "Collected",
      value: formatCurrency(summary.totalPaymentsCollected),
    },
    {
      id: "outstanding",
      label: "Outstanding",
      value: formatCurrency(summary.outstandingBalance),
    },
    {
      id: "overdue",
      label: "Overdue",
      value: formatCurrency(summary.overdueBalance),
    },
    {
      id: "net-income",
      label: "Net income est.",
      value: formatCurrency(summary.netIncomeEstimate),
    },
  ];

  return (
    <section className="rounded-[1.25rem] border border-[rgba(138,99,36,0.12)] bg-[#FBF7EF] shadow-[0_4px_16px_rgba(3,7,12,0.08)]">
      <div className="flex flex-col gap-3 border-b border-[rgba(138,99,36,0.12)] bg-[#FFF9EA] px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8A6324]">
            Period ledger
          </p>
          <h2 className="mt-0.5 text-sm font-bold text-[#17130E]">
            {periodLabel} operating snapshot
          </h2>
          <p className="mt-0.5 text-xs text-[#6B6255]">
            Bookkeeping totals from records entered in Altair OS.
          </p>
        </div>
        <Link
          href={taxSummaryHref}
          className="north-star-reports-tax-link inline-flex shrink-0 items-center gap-1.5 text-xs font-semibold text-[#8A6324] transition-colors hover:text-[#6B5A2E]"
        >
          Open tax summary
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-px bg-[rgba(138,99,36,0.10)] sm:grid-cols-4">
        {metrics.map((metric) => (
          <div
            key={metric.id}
            className="bg-[#FBF7EF] px-4 py-3.5 sm:px-5 sm:py-4"
          >
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#6B6255]">
              {metric.label}
            </p>
            <p className="mt-1.5 truncate text-lg font-bold tabular-nums tracking-tight text-[#17130E] sm:text-xl">
              {metric.value}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
