import type { ReactNode } from "react";
import { formatCurrency } from "@/shared/types/customer";
import type { AccountantSummaryData, ReportsPageDateRange } from "@/shared/types/reports-page";
import { REPORTS_PAGE_DATE_RANGE_OPTIONS } from "@/shared/types/reports-page";
import {
  MasterContentStack,
  MasterPageCanvas,
  MasterPageSection,
  MasterPageSurface,
  MasterShellPage,
} from "@/shared/design-system/shell";
import { TaxSummaryActions } from "./TaxSummaryActions";

type TaxSummaryPageViewProps = {
  summary: AccountantSummaryData;
  generatedAt: string;
  dateRange: ReportsPageDateRange;
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

function SummaryTableSurface({ children }: { children: ReactNode }) {
  return (
    <MasterPageSurface
      variant="section"
      className="rounded-xl border-slate-200 px-4 py-0 shadow-none"
    >
      {children}
    </MasterPageSurface>
  );
}

export function TaxSummaryPageView({
  summary,
  generatedAt,
  dateRange,
}: TaxSummaryPageViewProps) {
  const rangeLabel =
    REPORTS_PAGE_DATE_RANGE_OPTIONS.find(
      (option) => option.value === summary.dateRange,
    )?.label ?? summary.dateRange;

  return (
    <MasterShellPage density="compact">
      <MasterPageCanvas width="detail" className="max-w-4xl">
        <MasterContentStack density="compact">
          <TaxSummaryActions dateRange={dateRange} />

          <MasterPageSurface
            variant="card"
            className="bg-white px-6 py-8 text-slate-900 sm:px-10 sm:py-10 print:rounded-none print:border-0 print:shadow-none print:ring-0"
          >
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

            <MasterContentStack density="compact" className="mt-8">
              <MasterPageSection title="Financial Overview" density="compact">
                <SummaryTableSurface>
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
                </SummaryTableSurface>
              </MasterPageSection>

              <MasterPageSection title="Payments by Method" density="compact">
                <SummaryTableSurface>
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
                </SummaryTableSurface>
              </MasterPageSection>

              <div className="grid gap-8 md:grid-cols-2">
                <MasterPageSection title="Revenue by Customer" density="compact">
                  <SummaryTableSurface>
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
                  </SummaryTableSurface>
                </MasterPageSection>

                <MasterPageSection title="Revenue by Service Category" density="compact">
                  <SummaryTableSurface>
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
                  </SummaryTableSurface>
                </MasterPageSection>
              </div>

              <MasterPageSection title="Invoice Aging" density="compact">
                <SummaryTableSurface>
                  {summary.invoiceAging.map((bucket) => (
                    <SummaryRow
                      key={bucket.label}
                      label={`${bucket.label} (${bucket.count})`}
                      value={formatCurrency(bucket.amount)}
                    />
                  ))}
                </SummaryTableSurface>
              </MasterPageSection>
            </MasterContentStack>

            <footer className="mt-10 border-t border-slate-200 pt-4 text-xs text-slate-500">
              Exported {new Date(generatedAt).toLocaleString("en-US")}
            </footer>
          </MasterPageSurface>
        </MasterContentStack>
      </MasterPageCanvas>
    </MasterShellPage>
  );
}
