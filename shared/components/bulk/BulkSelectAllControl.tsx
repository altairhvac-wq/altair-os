"use client";

type BulkSelectAllControlProps = {
  selectableCount: number;
  allSelected: boolean;
  onSelectAll: () => void;
  onClearSelection: () => void;
  className?: string;
};

export function BulkSelectAllControl({
  selectableCount,
  allSelected,
  onSelectAll,
  onClearSelection,
  className,
}: BulkSelectAllControlProps) {
  if (selectableCount === 0) {
    return null;
  }

  if (allSelected) {
    return (
      <button
        type="button"
        onClick={onClearSelection}
        className={`inline-flex min-h-9 shrink-0 items-center justify-center rounded-lg border border-slate-200/90 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50 ${className ?? ""}`}
      >
        Clear
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onSelectAll}
      className={`inline-flex min-h-9 shrink-0 items-center justify-center rounded-lg border border-cyan-200 bg-cyan-50 px-2.5 py-1.5 text-xs font-semibold text-cyan-900 transition-colors hover:border-cyan-300 hover:bg-cyan-100 ${className ?? ""}`}
    >
      Select all
    </button>
  );
}
