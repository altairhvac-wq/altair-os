import { formatCurrency } from "@/shared/types/customer";
import { formatTaxRate } from "@/shared/types/estimate";

type BillingDocumentStyle = "default" | "invoice";

type BillingTotalsSummaryProps = {
  subtotal: number;
  taxRate?: number;
  taxAmount?: number;
  total: number;
  amountPaid?: number;
  balanceDue?: number;
  documentStyle?: BillingDocumentStyle;
};

function TotalsRow({
  label,
  value,
  className = "text-sm text-slate-600",
  valueClassName,
}: {
  label: string;
  value: string;
  className?: string;
  valueClassName?: string;
}) {
  return (
    <div className={`flex items-center justify-between gap-3 ${className}`}>
      <span className="min-w-0">{label}</span>
      <span className={`shrink-0 tabular-nums ${valueClassName ?? ""}`}>
        {value}
      </span>
    </div>
  );
}

export function BillingTotalsSummary({
  subtotal,
  taxRate = 0,
  taxAmount = 0,
  total,
  amountPaid = 0,
  balanceDue = 0,
  documentStyle = "default",
}: BillingTotalsSummaryProps) {
  const isInvoiceStyle = documentStyle === "invoice";
  const showTax = taxRate > 0 || taxAmount > 0;
  const showPaymentSummary = amountPaid > 0 || balanceDue > 0;
  const showBalanceInTotals = !isInvoiceStyle && balanceDue > 0;

  const containerClass = isInvoiceStyle
    ? "rounded-xl border border-slate-200 bg-white px-5 py-4 sm:px-6 sm:py-5 print:break-inside-avoid print:rounded-none print:border-slate-300 print:bg-white"
    : "rounded-lg border border-slate-200 bg-slate-50/50 px-4 py-3 sm:px-5 sm:py-4 print:break-inside-avoid print:border-slate-300 print:bg-white";

  const rowClass = isInvoiceStyle
    ? "text-sm text-slate-600"
    : "text-sm text-slate-600";

  return (
    <div className={containerClass}>
      <TotalsRow
        label="Subtotal"
        value={formatCurrency(subtotal)}
        className={rowClass}
      />

      {showTax ? (
        <div className="mt-2.5">
          <TotalsRow
            label={`Tax${taxRate > 0 ? ` (${formatTaxRate(taxRate)}%)` : ""}`}
            value={formatCurrency(taxAmount)}
            className={rowClass}
          />
        </div>
      ) : null}

      <div
        className={
          isInvoiceStyle
            ? "mt-4 flex items-center justify-between gap-3 border-t-2 border-slate-900 pt-4"
            : "mt-3 flex items-center justify-between gap-3 border-t border-slate-200 pt-3"
        }
      >
        <span
          className={
            isInvoiceStyle
              ? "text-sm font-bold uppercase tracking-[0.06em] text-slate-900"
              : "text-sm font-semibold text-slate-700"
          }
        >
          Total
        </span>
        <span
          className={
            isInvoiceStyle
              ? "shrink-0 text-xl font-bold tabular-nums text-slate-900 sm:text-2xl"
              : "shrink-0 text-lg font-bold tabular-nums text-slate-900 sm:text-xl"
          }
        >
          {formatCurrency(total)}
        </span>
      </div>

      {showPaymentSummary ? (
        <div
          className={
            isInvoiceStyle
              ? "mt-4 space-y-2 border-t border-slate-100 pt-4"
              : "mt-3 space-y-2 border-t border-slate-100 pt-3"
          }
        >
          {amountPaid > 0 ? (
            <TotalsRow
              label="Paid"
              value={formatCurrency(amountPaid)}
              className="text-sm text-emerald-700 print:text-slate-700"
              valueClassName="font-semibold print:text-slate-900"
            />
          ) : null}
          {showBalanceInTotals ? (
            <div className="flex items-center justify-between gap-3 rounded-lg bg-amber-50 px-3 py-2.5 ring-1 ring-amber-200/80 print:rounded-none print:border print:border-slate-400 print:bg-white print:px-0 print:py-2 print:ring-0">
              <span className="text-sm font-semibold text-amber-900 print:text-slate-900">
                Amount due
              </span>
              <span className="shrink-0 text-lg font-bold tabular-nums text-amber-900 print:text-slate-900">
                {formatCurrency(balanceDue)}
              </span>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
