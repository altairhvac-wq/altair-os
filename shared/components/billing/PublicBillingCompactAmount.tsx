import { formatCurrency } from "@/shared/types/customer";

type PublicBillingCompactAmountProps = {
  label: string;
  amount: number;
  /** Shown as a second line when amount is text (e.g. Paid in full). */
  displayValue?: string;
  hint?: string;
  /** Larger amount for primary approval actions. */
  emphasis?: "default" | "primary";
};

export function PublicBillingCompactAmount({
  label,
  amount,
  displayValue,
  hint,
  emphasis = "default",
}: PublicBillingCompactAmountProps) {
  const isPrimary = emphasis === "primary";

  return (
    <div
      className={`flex min-w-0 items-center justify-between gap-3 ${
        isPrimary
          ? "rounded-lg bg-slate-900 px-3 py-2.5 text-white"
          : "rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5"
      }`}
      aria-label={label}
    >
      <div className="min-w-0">
        <p
          className={`text-[10px] font-semibold uppercase tracking-wide ${
            isPrimary ? "text-slate-300" : "text-slate-500"
          }`}
        >
          {label}
        </p>
        {hint ? (
          <p
            className={`mt-0.5 text-[11px] leading-snug ${
              isPrimary ? "text-slate-300" : "text-slate-600"
            }`}
          >
            {hint}
          </p>
        ) : null}
      </div>
      <p
        className={`shrink-0 font-bold tabular-nums tracking-tight ${
          isPrimary ? "text-2xl text-white" : "text-xl text-slate-900"
        }`}
      >
        {displayValue ?? formatCurrency(amount)}
      </p>
    </div>
  );
}
