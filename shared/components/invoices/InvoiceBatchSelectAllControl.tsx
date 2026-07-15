"use client";

type InvoiceBatchSelectAllControlProps = {
  selectableCount: number;
  allEligibleSelected: boolean;
  onCheckAll: () => void;
  onClearSelection: () => void;
  northStar?: boolean;
};

export function InvoiceBatchSelectAllControl({
  selectableCount,
  allEligibleSelected,
  onCheckAll,
  onClearSelection,
  northStar = false,
}: InvoiceBatchSelectAllControlProps) {
  if (selectableCount === 0) {
    return null;
  }

  const clearClass = northStar
    ? "inline-flex min-h-11 shrink-0 items-center justify-center rounded-lg border border-[rgba(138,99,36,0.22)] bg-[#FFF9EA] px-2.5 py-1.5 text-xs font-semibold text-[#4F4638] transition-colors hover:border-[#C9A44D] hover:bg-[#F3EBDD] md:min-h-9"
    : "inline-flex min-h-11 shrink-0 items-center justify-center rounded-lg border border-slate-200/90 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50 md:min-h-9";

  const checkAllClass = northStar
    ? "inline-flex min-h-11 shrink-0 items-center justify-center rounded-lg border border-[#D6BE78] bg-[#EFE4CB] px-2.5 py-1.5 text-xs font-semibold text-[#17130E] transition-colors hover:border-[#E6D092] hover:bg-[#F3EBDD] md:min-h-9"
    : "inline-flex min-h-11 shrink-0 items-center justify-center rounded-lg border border-cyan-200 bg-cyan-50 px-2.5 py-1.5 text-xs font-semibold text-cyan-900 transition-colors hover:border-cyan-300 hover:bg-cyan-100 md:min-h-9";

  if (allEligibleSelected) {
    return (
      <button type="button" onClick={onClearSelection} className={clearClass}>
        Clear
      </button>
    );
  }

  return (
    <button type="button" onClick={onCheckAll} className={checkAllClass}>
      Check all
    </button>
  );
}
