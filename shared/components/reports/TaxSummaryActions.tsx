"use client";

import Link from "next/link";
import type { ReportsPageDateRange } from "@/shared/types/reports-page";

type TaxSummaryActionsProps = {
  dateRange: ReportsPageDateRange;
};

export function TaxSummaryActions({ dateRange }: TaxSummaryActionsProps) {
  return (
    <div className="no-print border-b border-slate-200 bg-white px-4 py-3 sm:px-6">
      <div className="mx-auto flex max-w-4xl items-center justify-between gap-3">
        <Link href={`/reports?range=${dateRange}`} className="admin-btn-secondary text-sm">
          Back to Reports
        </Link>
        <button
          type="button"
          onClick={() => window.print()}
          className="admin-btn-primary text-sm"
        >
          Print Summary
        </button>
      </div>
    </div>
  );
}
