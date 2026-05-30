import { formatCurrency } from "@/shared/types/customer";

type PublicBillingCompactAmountProps = {
  label: string;
  amount: number;
  /** Shown as a second line when amount is text (e.g. Paid in full). */
  displayValue?: string;
  hint?: string;
};

export function PublicBillingCompactAmount({
  label,
  amount,
  displayValue,
  hint,
}: PublicBillingCompactAmountProps) {
  return (
    <div
      className="flex min-w-0 items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5"
      aria-label={label}
    >
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
          {label}
        </p>
        {hint ? (
          <p className="mt-0.5 text-[11px] leading-snug text-slate-600">{hint}</p>
        ) : null}
      </div>
      <p className="shrink-0 text-xl font-bold tabular-nums tracking-tight text-slate-900">
        {displayValue ?? formatCurrency(amount)}
      </p>
    </div>
  );
}
