import { formatCurrency, formatDate } from "@/shared/types/customer";

type EstimateTotalHeroProps = {
  total: number;
  validUntil?: string | null;
};

export function EstimateTotalHero({ total, validUntil }: EstimateTotalHeroProps) {
  const trimmedValidUntil = validUntil?.trim();

  return (
    <div
      className="estimate-total-hero rounded-2xl border-2 border-slate-900 bg-slate-900 px-6 py-7 text-white shadow-lg shadow-slate-900/20 sm:px-7 sm:py-8 print:rounded-none print:border-2 print:border-slate-900 print:bg-white print:px-0 print:py-5 print:text-slate-900 print:shadow-none"
      aria-label="Estimated total"
    >
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-300 print:text-slate-600">
        Estimated total
      </p>

      <p className="mt-2 text-4xl font-bold tabular-nums tracking-tight sm:text-5xl print:mt-1 print:text-3xl print:text-slate-900">
        {formatCurrency(total)}
      </p>

      {trimmedValidUntil ? (
        <p className="mt-3 text-sm font-medium text-slate-300 print:mt-2 print:text-slate-600">
          Valid until {formatDate(trimmedValidUntil)}
        </p>
      ) : (
        <p className="mt-3 text-sm font-medium text-slate-300 print:mt-2 print:text-slate-600">
          Proposed investment for the described scope of work
        </p>
      )}
    </div>
  );
}
