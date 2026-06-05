import { formatCurrency } from "@/shared/types/customer";
import type { AccountantSummaryData } from "@/shared/types/reports-page";
import { REPORTS_PAGE_DATE_RANGE_OPTIONS } from "@/shared/types/reports-page";

type TaxSummaryPageViewProps = {
  summary: AccountantSummaryData;
  generatedAt: string;
};

function SummaryRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-slate-200 py-2.5 text-sm last:border-b-0">
      <span className="text-slate-600">{label}</span>
      <span className="font-semibold text-slate-900">{value}</span>
    </div>
  );
}

export function TaxSummaryPageView({
  summary,
  generatedAt,
}: TaxSummaryPageViewProps) {
  const rangeLabel =
    REPORTS_PAGE_DATE_RANGE_OPTIONS.find(
      (option) => option.value === summary.dateRange,
    )?.label ?? summary.dateRange;

  return (
    <div className="mx-auto max-w-4xl bg-white px-6 py-8 text-slate-900 sm:px-10 sm:py-10">
      <header className="border-b border-slate-200 pb-6">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">
          Accountant Summary
        </p>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">
          {summary.companyName}
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Reporting period: {rangeLabel} ({summary.dateBounds.startDate} –{" "}
          {summary.dateBounds.endDate})
        </p>
        <p className="mt-1 text-xs text-slate-500">
          For bookkeeping review only. This report only includes records entered
          in Altair OS and is not a complete tax return.
        </p>
      </header>

      <section className="mt-8">
        <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">
          Financial Overview
        </h2>
        <div className="mt-3 rounded-xl border border-slate-200 px-4">
          <SummaryRow
            label="Total invoice value"
            value={formatCurrency(summary.totalInvoiceValue)}
          />
          <SummaryRow
            label="Total payments collected"
            value={formatCurrency(summary.totalPaymentsCollected)}
          />
          <SummaryRow
            label="Outstanding invoice balance"
            value={formatCurrency(summary.outstandingBalance)}
          />
          <SummaryRow
            label="Overdue invoice balance"
            value={formatCurrency(summary.overdueBalance)}
          />
          <SummaryRow
            label="Sales tax collected"
            value={formatCurrency(summary.salesTaxCollected)}
          />
          <SummaryRow
            label="Expenses entered in Altair OS"
            value={formatCurrency(summary.expensesRecorded)}
          />
          <SummaryRow
            label="Net income estimate (Altair records only)"
            value={formatCurrency(summary.netIncomeEstimate)}
          />
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">
          Payments by Method
        </h2>
        <div className="mt-3 rounded-xl border border-slate-200 px-4">
          {summary.paymentsByMethod.length === 0 ? (
            <p className="py-3 text-sm text-slate-500">No payments in period.</p>
          ) : (
            summary.paymentsByMethod.map((entry) => (
              <SummaryRow
                key={entry.method}
                label={`${entry.method} (${entry.count})`}
                value={formatCurrency(entry.amount)}
              />
            ))
          )}
        </div>
      </section>

      <div className="mt-8 grid gap-8 md:grid-cols-2">
        <section>
          <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">
            Revenue by Customer
          </h2>
          <div className="mt-3 rounded-xl border border-slate-200 px-4">
            {summary.revenueByCustomer.length === 0 ? (
              <p className="py-3 text-sm text-slate-500">No customer revenue.</p>
            ) : (
              summary.revenueByCustomer.map((entry) => (
                <SummaryRow
                  key={entry.id}
                  label={entry.label}
                  value={entry.value}
                />
              ))
            )}
          </div>
        </section>

        <section>
          <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">
            Revenue by Service Category
          </h2>
          <div className="mt-3 rounded-xl border border-slate-200 px-4">
            {summary.revenueByServiceCategory.length === 0 ? (
              <p className="py-3 text-sm text-slate-500">No service revenue.</p>
            ) : (
              summary.revenueByServiceCategory.map((entry) => (
                <SummaryRow
                  key={entry.id}
                  label={entry.label}
                  value={entry.value}
                />
              ))
            )}
          </div>
        </section>
      </div>

      <section className="mt-8">
        <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">
          Invoice Aging
        </h2>
        <div className="mt-3 rounded-xl border border-slate-200 px-4">
          {summary.invoiceAging.map((bucket) => (
            <SummaryRow
              key={bucket.label}
              label={`${bucket.label} (${bucket.count})`}
              value={formatCurrency(bucket.amount)}
            />
          ))}
        </div>
      </section>

      <footer className="mt-10 border-t border-slate-200 pt-4 text-xs text-slate-500">
        Exported {new Date(generatedAt).toLocaleString("en-US")}
      </footer>
    </div>
  );
}
