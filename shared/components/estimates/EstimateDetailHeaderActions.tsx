"use client";

import { Printer } from "lucide-react";

export function EstimateDetailHeaderActions() {
  function handlePrint() {
    window.print();
  }

  return (
    <button
      type="button"
      onClick={handlePrint}
      className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
    >
      <Printer className="h-4 w-4" />
      <span className="hidden sm:inline">Print</span>
    </button>
  );
}
