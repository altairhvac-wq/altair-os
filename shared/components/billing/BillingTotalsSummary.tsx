import { formatCurrency } from "@/shared/types/customer";
import { formatTaxRate } from "@/shared/types/estimate";

type BillingTotalsSummaryProps = {
  subtotal: number;
  taxRate?: number;
  taxAmount?: number;
  total: number;
  amountPaid?: number;
  balanceDue?: number;
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
}: BillingTotalsSummaryProps) {
  const showTax = taxRate > 0 || taxAmount > 0;
  const showPaymentSummary = amountPaid > 0 || balanceDue > 0;

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50/50 px-4 py-3 sm:px-5 sm:py-4 print:border-slate-300 print:bg-white">
      <TotalsRow
        label="Subtotal"
        value={formatCurrency(subtotal)}
      />

      {showTax ? (
        <div className="mt-2">
          <TotalsRow
            label={`Tax${taxRate > 0 ? ` (${formatTaxRate(taxRate)}%)` : ""}`}
            value={formatCurrency(taxAmount)}
          />
        </div>
      ) : null}

      <div className="mt-3 flex items-center justify-between gap-3 border-t border-slate-200 pt-3">
        <span className="text-sm font-semibold text-slate-700">Total</span>
        <span className="shrink-0 text-lg font-bold tabular-nums text-slate-900 sm:text-xl">
          {formatCurrency(total)}
        </span>
      </div>

      {showPaymentSummary ? (
        <div className="mt-3 space-y-2 border-t border-slate-100 pt-3">
          {amountPaid > 0 ? (
            <TotalsRow
              label="Paid"
              value={formatCurrency(amountPaid)}
              className="text-sm text-emerald-700"
              valueClassName="font-semibold"
            />
          ) : null}
          {balanceDue > 0 ? (
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
