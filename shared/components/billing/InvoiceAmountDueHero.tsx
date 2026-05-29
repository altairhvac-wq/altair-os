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
      className="invoice-amount-due-hero rounded-xl border-2 border-slate-900 bg-slate-900 px-5 py-5 text-white sm:px-6 sm:py-6 print:rounded-none print:border-2 print:border-slate-900 print:bg-white print:px-0 print:py-4 print:text-slate-900"
      aria-label={isPaidInFull ? "Invoice paid in full" : "Amount due"}
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-300 print:text-slate-600">
        {isPaidInFull ? "Payment status" : "Amount due"}
      </p>

      <p className="mt-1 text-3xl font-bold tabular-nums tracking-tight sm:text-4xl print:mt-0.5 print:text-3xl print:text-slate-900">
        {isPaidInFull ? "Paid in full" : formatCurrency(balanceDue)}
      </p>

      {!isPaidInFull ? (
        <p className="mt-2 text-sm text-slate-300 print:text-slate-600">
          Due {formatDate(dueDate)}
        </p>
      ) : null}

      {hasPartialPayment || (amountPaid > 0 && isPaidInFull) ? (
        <dl className="mt-4 space-y-1.5 border-t border-slate-700 pt-4 text-sm print:mt-3 print:border-slate-300 print:pt-3">
          <div className="flex items-center justify-between gap-3">
            <dt className="text-slate-400 print:text-slate-600">Invoice total</dt>
            <dd className="font-medium tabular-nums text-slate-200 print:text-slate-900">
              {formatCurrency(total)}
            </dd>
          </div>
          {amountPaid > 0 ? (
            <div className="flex items-center justify-between gap-3">
              <dt className="text-slate-400 print:text-slate-600">Amount paid</dt>
              <dd className="font-medium tabular-nums text-emerald-300 print:text-slate-900">
                {formatCurrency(amountPaid)}
              </dd>
            </div>
          ) : null}
        </dl>
      ) : null}
    </div>
  );
}
