import { formatCurrency, formatDate } from "@/shared/types/customer";

type EstimateTotalHeroProps = {
  total: number;
  validUntil?: string | null;
};

export function EstimateTotalHero({ total, validUntil }: EstimateTotalHeroProps) {
  const trimmedValidUntil = validUntil?.trim();

  return (
    <div
      className="estimate-total-hero rounded-xl border-2 border-slate-900 bg-slate-900 px-3 py-3 text-white shadow-lg shadow-slate-900/20 sm:rounded-2xl sm:px-6 sm:py-7 md:px-7 md:py-8 print:rounded-none print:border-2 print:border-slate-900 print:bg-white print:px-0 print:py-5 print:text-slate-900 print:shadow-none"
      aria-label="Estimated total"
    >
      <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-slate-300 sm:text-[10px] sm:tracking-[0.16em] print:text-slate-600">
        Estimated total
      </p>

      <p className="mt-1 text-2xl font-bold tabular-nums tracking-tight sm:mt-2 sm:text-4xl md:text-5xl print:mt-1 print:text-3xl print:text-slate-900">
        {formatCurrency(total)}
      </p>

      {trimmedValidUntil ? (
        <p className="mt-1.5 text-xs font-medium leading-snug text-slate-300 sm:mt-3 sm:text-sm print:mt-2 print:text-slate-600">
          Valid until {formatDate(trimmedValidUntil)}
        </p>
      ) : (
        <p className="mt-1.5 text-xs font-medium leading-snug text-slate-300 sm:mt-3 sm:text-sm print:mt-2 print:text-slate-600">
          <span className="sm:hidden">Proposed scope total</span>
          <span className="hidden sm:inline">
            Proposed investment for the described scope of work
          </span>
        </p>
      )}
    </div>
  );
}
