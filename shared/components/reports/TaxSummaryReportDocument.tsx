import type { ReactNode } from "react";
import { formatCurrency } from "@/shared/types/customer";
import type { AccountantSummaryData } from "@/shared/types/reports-page";
import { REPORTS_PAGE_DATE_RANGE_OPTIONS } from "@/shared/types/reports-page";
import {
  MasterContentStack,
  MasterPageSection,
  MasterPageSurface,
} from "@/shared/design-system/shell";
import {
  isNorthStarReportSurface,
  type ReportSurfaceVariant,
} from "./report-surface-variant";

type TaxSummaryReportDocumentProps = {
  summary: AccountantSummaryData;
  generatedAt: string;
  variant?: ReportSurfaceVariant;
};

function SummaryRow({
  label,
  value,
  northStar,
}: {
  label: string;
  value: string;
  northStar: boolean;
}) {
  if (northStar) {
    return (
      <div className="flex items-start justify-between gap-4 border-b border-[rgba(138,99,36,0.12)] py-2.5 text-sm last:border-b-0">
        <span className="text-[#4F4638]">{label}</span>
        <span className="font-semibold tabular-nums text-[#17130E]">{value}</span>
      </div>
    );
  }

  return (
    <div className="flex items-start justify-between gap-4 border-b border-slate-200 py-2.5 text-sm last:border-b-0">
      <span className="text-slate-600">{label}</span>
      <span className="font-semibold text-slate-900">{value}</span>
    </div>
  );
}

function SummaryTableSurface({
  children,
  northStar,
}: {
  children: ReactNode;
  northStar: boolean;
}) {
  if (northStar) {
    return (
      <div className="rounded-xl border border-[rgba(138,99,36,0.12)] bg-[#FFF9EA]/60 px-4 py-0">
        {children}
      </div>
    );
  }

  return (
    <MasterPageSurface
      variant="section"
      className="rounded-xl border-slate-200 px-4 py-0 shadow-none"
    >
      {children}
    </MasterPageSurface>
  );
}

function EmptyRowMessage({
  children,
  northStar,
}: {
  children: ReactNode;
  northStar: boolean;
}) {
  return (
    <p
      className={`py-3 text-sm ${northStar ? "text-[#64748B]" : "text-slate-500"}`}
    >
      {children}
    </p>
  );
}

function ReportSection({
  title,
  children,
  northStar,
}: {
  title: string;
  children: ReactNode;
  northStar: boolean;
}) {
  if (northStar) {
    return (
      <section>
        <h2 className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#4F4638]">
          {title}
        </h2>
        <div className="mt-2">{children}</div>
      </section>
    );
  }

  return (
    <MasterPageSection title={title} density="compact">
      {children}
    </MasterPageSection>
  );
}

export function TaxSummaryReportDocument({
  summary,
  generatedAt,
  variant = "legacy",
}: TaxSummaryReportDocumentProps) {
  const northStar = isNorthStarReportSurface(variant);
  const rangeLabel =
    REPORTS_PAGE_DATE_RANGE_OPTIONS.find(
      (option) => option.value === summary.dateRange,
    )?.label ?? summary.dateRange;

  const documentSurfaceClass = northStar
    ? "rounded-[1.25rem] border border-[rgba(138,99,36,0.12)] bg-[#FBF7EF] px-6 py-8 text-[#17130E] shadow-[0_4px_16px_rgba(3,7,12,0.08)] sm:px-10 sm:py-10 print:rounded-none print:border-0 print:shadow-none print:ring-0"
    : "bg-white px-6 py-8 text-slate-900 sm:px-10 sm:py-10 print:rounded-none print:border-0 print:shadow-none print:ring-0";

  const headerBorderClass = northStar
    ? "border-b border-[rgba(138,99,36,0.12)] pb-6"
    : "border-b border-slate-200 pb-6";

  const footerClass = northStar
    ? "mt-10 border-t border-[rgba(138,99,36,0.12)] pt-4 text-xs text-[#64748B]"
    : "mt-10 border-t border-slate-200 pt-4 text-xs text-slate-500";

  const documentInner = (
    <>
      <header className={headerBorderClass}>
        <p
          className={
            northStar
              ? "text-[10px] font-semibold uppercase tracking-[0.18em] text-[#8A6324]"
              : "text-xs font-bold uppercase tracking-[0.2em] text-slate-500"
          }
        >
          Accountant Summary
        </p>
        <h1
          className={
            northStar
              ? "mt-2 text-2xl font-bold tracking-tight text-[#17130E]"
              : "mt-2 text-2xl font-bold text-slate-900"
          }
        >
          {summary.companyName}
        </h1>
        <p
          className={
            northStar
              ? "mt-2 text-sm text-[#4F4638]"
              : "mt-2 text-sm text-slate-600"
          }
        >
          Reporting period: {rangeLabel} ({summary.dateBounds.startDate} –{" "}
          {summary.dateBounds.endDate})
        </p>
        <p
          className={
            northStar
              ? "mt-1 text-xs leading-relaxed text-[#64748B]"
              : "mt-1 text-xs text-slate-500"
          }
        >
          For bookkeeping review only. This report only includes records entered
          in Altair OS and is not a complete tax return.
        </p>
      </header>

      <MasterContentStack density="compact" className="mt-8">
        <ReportSection title="Financial Overview" northStar={northStar}>
          <SummaryTableSurface northStar={northStar}>
            <SummaryRow
              label="Total invoice value"
              value={formatCurrency(summary.totalInvoiceValue)}
              northStar={northStar}
            />
            <SummaryRow
              label="Total payments collected"
              value={formatCurrency(summary.totalPaymentsCollected)}
              northStar={northStar}
            />
            <SummaryRow
              label="Outstanding invoice balance"
              value={formatCurrency(summary.outstandingBalance)}
              northStar={northStar}
            />
            <SummaryRow
              label="Overdue invoice balance"
              value={formatCurrency(summary.overdueBalance)}
              northStar={northStar}
            />
            <SummaryRow
              label="Sales tax collected"
              value={formatCurrency(summary.salesTaxCollected)}
              northStar={northStar}
            />
            <SummaryRow
              label="Expenses entered in Altair OS"
              value={formatCurrency(summary.expensesRecorded)}
              northStar={northStar}
            />
            <SummaryRow
              label="Net income estimate (Altair records only)"
              value={formatCurrency(summary.netIncomeEstimate)}
              northStar={northStar}
            />
          </SummaryTableSurface>
        </ReportSection>

        <ReportSection title="Payments by Method" northStar={northStar}>
          <SummaryTableSurface northStar={northStar}>
            {summary.paymentsByMethod.length === 0 ? (
              <EmptyRowMessage northStar={northStar}>
                No payments in period.
              </EmptyRowMessage>
            ) : (
              summary.paymentsByMethod.map((entry) => (
                <SummaryRow
                  key={entry.method}
                  label={`${entry.method} (${entry.count})`}
                  value={formatCurrency(entry.amount)}
                  northStar={northStar}
                />
              ))
            )}
          </SummaryTableSurface>
        </ReportSection>

        <div className="grid gap-8 md:grid-cols-2">
          <ReportSection title="Revenue by Customer" northStar={northStar}>
            <SummaryTableSurface northStar={northStar}>
              {summary.revenueByCustomer.length === 0 ? (
                <EmptyRowMessage northStar={northStar}>
                  No customer revenue.
                </EmptyRowMessage>
              ) : (
                summary.revenueByCustomer.map((entry) => (
                  <SummaryRow
                    key={entry.id}
                    label={entry.label}
                    value={entry.value}
                    northStar={northStar}
                  />
                ))
              )}
            </SummaryTableSurface>
          </ReportSection>

          <ReportSection title="Revenue by Service Category" northStar={northStar}>
            <SummaryTableSurface northStar={northStar}>
              {summary.revenueByServiceCategory.length === 0 ? (
                <EmptyRowMessage northStar={northStar}>
                  No service revenue.
                </EmptyRowMessage>
              ) : (
                summary.revenueByServiceCategory.map((entry) => (
                  <SummaryRow
                    key={entry.id}
                    label={entry.label}
                    value={entry.value}
                    northStar={northStar}
                  />
                ))
              )}
            </SummaryTableSurface>
          </ReportSection>
        </div>

        <ReportSection title="Invoice Aging" northStar={northStar}>
          <SummaryTableSurface northStar={northStar}>
            {summary.invoiceAging.map((bucket) => (
              <SummaryRow
                key={bucket.label}
                label={`${bucket.label} (${bucket.count})`}
                value={formatCurrency(bucket.amount)}
                northStar={northStar}
              />
            ))}
          </SummaryTableSurface>
        </ReportSection>
      </MasterContentStack>

      <footer className={footerClass}>
        Exported {new Date(generatedAt).toLocaleString("en-US")}
      </footer>
    </>
  );

  if (northStar) {
    return (
      <section
        id="tax-summary-document"
        className={documentSurfaceClass}
        data-north-star-tax-summary-document="true"
      >
        {documentInner}
      </section>
    );
  }

  return (
    <MasterPageSurface variant="card" className={documentSurfaceClass}>
      {documentInner}
    </MasterPageSurface>
  );
}
