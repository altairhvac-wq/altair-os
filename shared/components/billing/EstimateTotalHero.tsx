import { formatCurrency } from "@/shared/types/customer";

type EstimateTotalHeroProps = {
  total: number;
  northStar?: boolean;
};

export function EstimateTotalHero({
  total,
  northStar = false,
}: EstimateTotalHeroProps) {
  if (northStar) {
    return (
      <div
        className="estimate-total-hero rounded-xl border border-[rgba(201,164,77,0.35)] bg-gradient-to-br from-[#273140] via-[#1F2937] to-[#17130E] px-3 py-2 text-[#FFF9EA] shadow-[0_12px_40px_-16px_rgba(3,7,12,0.42)] sm:rounded-2xl sm:px-4 sm:py-3 print:rounded-none print:border-2 print:border-slate-900 print:bg-white print:px-0 print:py-1.5 print:text-slate-900 print:shadow-none"
        aria-label="Estimated total"
      >
        <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-[#D6BE78] sm:text-[10px] sm:tracking-[0.16em] print:text-slate-600">
          Estimated total
        </p>

        <p className="mt-0.5 text-xl font-bold tabular-nums tracking-tight text-[#FFF9EA] sm:text-2xl print:mt-0 print:text-2xl print:text-slate-900">
          {formatCurrency(total)}
        </p>
      </div>
    );
  }

  return (
    <div
      className="estimate-total-hero rounded-xl border-2 border-slate-900 bg-slate-900 px-3 py-2.5 text-white shadow-lg shadow-slate-900/20 sm:rounded-2xl sm:px-5 sm:py-4 md:px-6 md:py-5 print:rounded-none print:border-2 print:border-slate-900 print:bg-white print:px-0 print:py-2 print:text-slate-900 print:shadow-none"
      aria-label="Estimated total"
    >
      <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-slate-300 sm:text-[10px] sm:tracking-[0.16em] print:text-slate-600">
        Estimated total
      </p>

      <p className="mt-0.5 text-xl font-bold tabular-nums tracking-tight sm:mt-1 sm:text-3xl md:text-4xl print:mt-0 print:text-2xl print:text-slate-900">
        {formatCurrency(total)}
      </p>
    </div>
  );
}
