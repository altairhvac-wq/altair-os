import { formatCurrency } from "@/shared/types/customer";
import { formatTaxRate } from "@/shared/types/estimate";
import type { BillingDocumentStyle } from "@/shared/lib/billing-document-style";

type BillingTotalsSummaryProps = {
  subtotal: number;
  taxRate?: number;
  taxAmount?: number;
  total: number;
  amountPaid?: number;
  balanceDue?: number;
  documentStyle?: BillingDocumentStyle;
  /** Hide the total row when the amount is already shown above the fold. */
  hideTotal?: boolean;
  /** Hide the balance due row when it is already shown above the fold. */
  hideBalanceDue?: boolean;
  /** Subtotal/tax only — no bordered totals card (estimate documents with hideTotal). */
  compactSubtotal?: boolean;
  northStar?: boolean;
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

function InvoiceTotalsRow({
  label,
  value,
  labelClassName = "text-xs text-slate-500",
  valueClassName = "text-xs font-medium tabular-nums text-slate-700",
}: {
  label: string;
  value: string;
  labelClassName?: string;
  valueClassName?: string;
}) {
  return (
    <div className="grid grid-cols-[1fr_auto] items-baseline gap-x-4">
      <span className={`text-right ${labelClassName}`}>{label}</span>
      <span className={valueClassName}>{value}</span>
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
  hideTotal = false,
  hideBalanceDue = false,
  compactSubtotal = false,
  northStar = false,
}: BillingTotalsSummaryProps) {
  const isInvoiceStyle = documentStyle === "invoice";
  const isEstimateStyle = documentStyle === "estimate";
  const isPremiumStyle = isInvoiceStyle || isEstimateStyle;
  const showTax = taxRate > 0 || taxAmount > 0;
  const showPaymentSummary =
    amountPaid > 0 || (balanceDue > 0 && !hideBalanceDue);
  const showBalanceInTotals = balanceDue > 0 && !hideBalanceDue;

  const containerClass = northStar && isPremiumStyle
    ? "rounded-lg border border-[rgba(138,99,36,0.14)] bg-[#FFF9EA] px-3 py-2.5 sm:rounded-xl sm:px-4 sm:py-3 print:break-inside-avoid print:rounded-none print:border-slate-300 print:bg-white print:px-0 print:py-2"
    : isPremiumStyle
    ? "rounded-lg border border-slate-200 bg-white px-3 py-3 sm:rounded-xl sm:px-5 sm:py-4 md:px-6 md:py-5 print:break-inside-avoid print:rounded-none print:border-slate-300 print:bg-white"
    : "rounded-lg border border-slate-200 bg-white px-4 py-3 sm:px-5 sm:py-4 print:break-inside-avoid print:border-slate-300 print:bg-white";

  const rowClass = "text-sm text-slate-600";

  if (isPremiumStyle) {
    const totalLabel = isEstimateStyle ? "Estimated total" : "Total";

    if (compactSubtotal && hideTotal) {
      return (
        <div className="ml-auto w-full max-w-[280px] space-y-1 print:max-w-[220px]">
          <InvoiceTotalsRow
            label="Subtotal"
            value={formatCurrency(subtotal)}
            labelClassName={
              northStar
                ? "text-xs text-[#4F4638] print:text-slate-600"
                : "text-xs text-slate-500"
            }
            valueClassName={
              northStar
                ? "text-xs font-medium tabular-nums text-[#4F4638] print:text-slate-700"
                : "text-xs font-medium tabular-nums text-slate-700"
            }
          />
          {showTax ? (
            <InvoiceTotalsRow
              label={`Tax${taxRate > 0 ? ` (${formatTaxRate(taxRate)}%)` : ""}`}
              value={formatCurrency(taxAmount)}
              labelClassName={
                northStar
                  ? "text-xs text-[#4F4638] print:text-slate-600"
                  : "text-xs text-slate-500"
              }
              valueClassName={
                northStar
                  ? "text-xs font-medium tabular-nums text-[#4F4638] print:text-slate-700"
                  : "text-xs font-medium tabular-nums text-slate-700"
              }
            />
          ) : null}
        </div>
      );
    }

    return (
      <div className={containerClass}>
        <div className="ml-auto w-full max-w-[280px] space-y-1.5 print:max-w-[240px]">
          <InvoiceTotalsRow
            label="Subtotal"
            value={formatCurrency(subtotal)}
          />

          {showTax ? (
            <InvoiceTotalsRow
              label={`Tax${taxRate > 0 ? ` (${formatTaxRate(taxRate)}%)` : ""}`}
              value={formatCurrency(taxAmount)}
            />
          ) : null}

          {!hideTotal ? (
            <div className={`!mt-3 grid grid-cols-[1fr_auto] items-baseline gap-x-4 border-t-2 ${northStar ? "border-[rgba(138,99,36,0.28)]" : "border-slate-900"} pt-3`}>
              <span className={northStar ? "text-right text-sm font-bold uppercase tracking-[0.08em] text-[#4F4638] print:text-slate-900" : "text-right text-sm font-bold uppercase tracking-[0.08em] text-slate-900"}>
                {totalLabel}
              </span>
              <span className={northStar ? "text-xl font-bold tabular-nums text-[#17130E] sm:text-2xl print:text-xl print:text-slate-900" : "text-2xl font-bold tabular-nums text-slate-900 sm:text-3xl print:text-2xl"}>
                {formatCurrency(total)}
              </span>
            </div>
          ) : null}

          {isInvoiceStyle && showPaymentSummary ? (
            <div className="!mt-4 space-y-2 border-t border-slate-200 pt-4">
              {amountPaid > 0 ? (
                <InvoiceTotalsRow
                  label="Paid"
                  value={formatCurrency(amountPaid)}
                  labelClassName="text-xs font-medium text-emerald-800 print:text-slate-700"
                  valueClassName="text-xs font-semibold tabular-nums text-emerald-800 print:text-slate-900"
                />
              ) : null}
              {showBalanceInTotals ? (
                <div className="grid grid-cols-[1fr_auto] items-baseline gap-x-4 rounded-lg bg-white px-3 py-3 ring-1 ring-slate-200/80 print:rounded-none print:border print:border-slate-400 print:bg-white print:px-0 print:py-2 print:ring-0">
                  <span className="text-right text-sm font-bold uppercase tracking-[0.06em] text-slate-900">
                    Balance due
                  </span>
                  <span className="text-xl font-bold tabular-nums text-slate-900 sm:text-2xl print:text-xl">
                    {formatCurrency(balanceDue)}
                  </span>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    );
  }

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

      {!hideTotal ? (
        <div className="mt-3 flex items-center justify-between gap-3 border-t border-slate-200 pt-3">
          <span className="text-sm font-semibold text-slate-700">Total</span>
          <span className="shrink-0 text-lg font-bold tabular-nums text-slate-900 sm:text-xl">
            {formatCurrency(total)}
          </span>
        </div>
      ) : null}

      {showPaymentSummary ? (
        <div className="mt-3 space-y-2 border-t border-slate-100 pt-3">
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
