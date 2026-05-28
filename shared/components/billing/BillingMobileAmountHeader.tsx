import { formatCurrency } from "@/shared/types/customer";

type BillingMobileAmountHeaderProps = {
  total: number;
  balanceDue?: number;
  amountLabel?: string;
};

export function BillingMobileAmountHeader({
  total,
  balanceDue = 0,
  amountLabel = "Total",
}: BillingMobileAmountHeaderProps) {
  return (
    <div className="mt-3 grid gap-2 sm:hidden">
      <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2.5">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          {amountLabel}
        </span>
        <span className="text-lg font-bold tabular-nums text-slate-900">
          {formatCurrency(total)}
        </span>
      </div>
      {balanceDue > 0 ? (
        <div className="flex items-center justify-between gap-3 rounded-lg bg-amber-50 px-3 py-2.5 ring-1 ring-amber-200/80">
          <span className="text-xs font-semibold uppercase tracking-wide text-amber-800">
            Amount due
          </span>
          <span className="text-lg font-bold tabular-nums text-amber-900">
            {formatCurrency(balanceDue)}
          </span>
        </div>
      ) : null}
    </div>
  );
}
