import { formatCurrency, formatDate } from "@/shared/types/customer";

type InvoiceAmountDueHeroProps = {
  balanceDue: number;
  total: number;
  amountPaid?: number;
  dueDate: string;
};

export function InvoiceAmountDueHero({
  balanceDue,
  total,
  amountPaid = 0,
  dueDate,
}: InvoiceAmountDueHeroProps) {
  const isPaidInFull = balanceDue <= 0;
  const hasPartialPayment = amountPaid > 0 && balanceDue > 0;

  return (
    <div
      className="invoice-amount-due-hero rounded-2xl border-2 border-slate-900 bg-slate-900 px-6 py-7 text-white shadow-lg shadow-slate-900/20 sm:px-7 sm:py-8 print:rounded-none print:border-2 print:border-slate-900 print:bg-white print:px-0 print:py-5 print:text-slate-900 print:shadow-none"
      aria-label={isPaidInFull ? "Invoice paid in full" : "Amount due"}
    >
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-300 print:text-slate-600">
        {isPaidInFull ? "Payment status" : "Amount due"}
      </p>

      <p className="mt-2 text-4xl font-bold tabular-nums tracking-tight sm:text-5xl print:mt-1 print:text-3xl print:text-slate-900">
        {isPaidInFull ? "Paid in full" : formatCurrency(balanceDue)}
      </p>

      {!isPaidInFull ? (
        <p className="mt-3 text-sm font-medium text-slate-300 print:mt-2 print:text-slate-600">
          Payment due by {formatDate(dueDate)}
        </p>
      ) : null}

      {hasPartialPayment || (amountPaid > 0 && isPaidInFull) ? (
        <dl className="mt-5 space-y-2 border-t border-slate-700 pt-5 text-sm print:mt-4 print:border-slate-300 print:pt-4">
          <div className="flex items-baseline justify-between gap-4">
            <dt className="text-slate-400 print:text-slate-600">Invoice total</dt>
            <dd className="font-semibold tabular-nums text-slate-100 print:text-slate-900">
              {formatCurrency(total)}
            </dd>
          </div>
          {amountPaid > 0 ? (
            <div className="flex items-baseline justify-between gap-4">
              <dt className="text-slate-400 print:text-slate-600">Amount paid</dt>
              <dd className="font-semibold tabular-nums text-emerald-300 print:text-slate-900">
                {formatCurrency(amountPaid)}
              </dd>
            </div>
          ) : null}
        </dl>
      ) : null}
    </div>
  );
}
