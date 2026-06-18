"use client";

type BulkSelectAllControlProps = {
  selectableCount: number;
  allSelected: boolean;
  onSelectAll: () => void;
  onClearSelection: () => void;
  className?: string;
  northStar?: boolean;
};

export function BulkSelectAllControl({
  selectableCount,
  allSelected,
  onSelectAll,
  onClearSelection,
  className,
  northStar = false,
}: BulkSelectAllControlProps) {
  if (selectableCount === 0) {
    return null;
  }

  const clearClass = northStar
    ? "inline-flex min-h-9 shrink-0 items-center justify-center rounded-lg border border-[rgba(138,99,36,0.22)] bg-[#FFF9EA] px-2.5 py-1.5 text-xs font-semibold text-[#4F4638] transition-colors hover:border-[#C9A44D] hover:bg-[#F3EBDD]"
    : "inline-flex min-h-9 shrink-0 items-center justify-center rounded-lg border border-slate-200/90 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50";

  const selectAllClass = northStar
    ? "inline-flex min-h-9 shrink-0 items-center justify-center rounded-lg border border-[#D6BE78] bg-[#EFE4CB] px-2.5 py-1.5 text-xs font-semibold text-[#17130E] transition-colors hover:border-[#E6D092] hover:bg-[#F3EBDD]"
    : "inline-flex min-h-9 shrink-0 items-center justify-center rounded-lg border border-cyan-200 bg-cyan-50 px-2.5 py-1.5 text-xs font-semibold text-cyan-900 transition-colors hover:border-cyan-300 hover:bg-cyan-100";

  if (allSelected) {
    return (
      <button
        type="button"
        onClick={onClearSelection}
        className={`${clearClass} ${className ?? ""}`}
      >
        Clear
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onSelectAll}
      className={`${selectAllClass} ${className ?? ""}`}
    >
      Select all
    </button>
  );
}
