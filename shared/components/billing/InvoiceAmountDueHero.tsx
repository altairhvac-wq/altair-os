import { formatCurrency, formatDate } from "@/shared/types/customer";

type InvoiceAmountDueHeroProps = {
  balanceDue: number;
  total: number;
  amountPaid?: number;
  dueDate: string;
  northStar?: boolean;
};

export function InvoiceAmountDueHero({
  balanceDue,
  total,
  amountPaid = 0,
  dueDate,
  northStar = false,
}: InvoiceAmountDueHeroProps) {
  const isPaidInFull = balanceDue <= 0;
  const hasPartialPayment = amountPaid > 0 && balanceDue > 0;

  if (northStar) {
    return (
      <div
        className="invoice-amount-due-hero rounded-xl border border-[rgba(201,164,77,0.35)] bg-gradient-to-br from-[#403527] via-[#372D21] to-[#17130E] px-3 py-2 text-[#FFF9EA] shadow-[0_12px_40px_-16px_rgba(3,7,12,0.42)] sm:rounded-2xl sm:px-4 sm:py-3 print:rounded-none print:border-2 print:border-slate-900 print:bg-white print:px-0 print:py-1.5 print:text-slate-900 print:shadow-none"
        aria-label={isPaidInFull ? "Invoice paid in full" : "Amount due"}
      >
        <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-[#D6BE78] sm:text-[10px] sm:tracking-[0.16em] print:text-slate-600">
          {isPaidInFull ? "Payment status" : "Amount due"}
        </p>

        <p className="mt-0.5 text-xl font-bold tabular-nums tracking-tight text-[#FFF9EA] sm:text-2xl print:mt-0 print:text-2xl print:text-slate-900">
          {isPaidInFull ? "Paid in full" : formatCurrency(balanceDue)}
        </p>

        {!isPaidInFull ? (
          <p className="mt-1 text-xs font-medium leading-snug text-[#D7CDBD] sm:text-sm print:mt-1 print:text-slate-600">
            Payment due by {formatDate(dueDate)}
          </p>
        ) : null}

        {hasPartialPayment || (amountPaid > 0 && isPaidInFull) ? (
          <dl className="mt-2 space-y-1 border-t border-[rgba(201,164,77,0.22)] pt-2 text-xs sm:mt-2.5 sm:space-y-1.5 sm:pt-2.5 sm:text-sm print:mt-2 print:border-slate-300 print:pt-2">
            <div className="flex items-baseline justify-between gap-4">
              <dt className="text-[#B8AD9E] print:text-slate-600">Invoice total</dt>
              <dd className="font-semibold tabular-nums text-[#FFF8E8] print:text-slate-900">
                {formatCurrency(total)}
              </dd>
            </div>
            {amountPaid > 0 ? (
              <div className="flex items-baseline justify-between gap-4">
                <dt className="text-[#B8AD9E] print:text-slate-600">Amount paid</dt>
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

  return (
    <div
      className="invoice-amount-due-hero rounded-xl border-2 border-slate-900 bg-slate-900 px-3 py-3 text-white shadow-lg shadow-slate-900/20 sm:rounded-2xl sm:px-6 sm:py-7 md:px-7 md:py-8 print:rounded-none print:border-2 print:border-slate-900 print:bg-white print:px-0 print:py-5 print:text-slate-900 print:shadow-none"
      aria-label={isPaidInFull ? "Invoice paid in full" : "Amount due"}
    >
      <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-slate-300 sm:text-[10px] sm:tracking-[0.16em] print:text-slate-600">
        {isPaidInFull ? "Payment status" : "Amount due"}
      </p>

      <p className="mt-1 text-2xl font-bold tabular-nums tracking-tight sm:mt-2 sm:text-4xl md:text-5xl print:mt-1 print:text-3xl print:text-slate-900">
        {isPaidInFull ? "Paid in full" : formatCurrency(balanceDue)}
      </p>

      {!isPaidInFull ? (
        <p className="mt-1.5 text-xs font-medium leading-snug text-slate-300 sm:mt-3 sm:text-sm print:mt-2 print:text-slate-600">
          <span className="sm:hidden">Due {formatDate(dueDate)}</span>
          <span className="hidden sm:inline">
            Payment due by {formatDate(dueDate)}
          </span>
        </p>
      ) : null}

      {hasPartialPayment || (amountPaid > 0 && isPaidInFull) ? (
        <dl className="mt-3 space-y-1.5 border-t border-slate-700 pt-3 text-xs sm:mt-5 sm:space-y-2 sm:pt-5 sm:text-sm print:mt-4 print:border-slate-300 print:pt-4">
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
