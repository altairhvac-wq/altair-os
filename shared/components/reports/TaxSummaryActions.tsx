"use client";

import Link from "next/link";
import type { ReportsPageDateRange } from "@/shared/types/reports-page";
import { MasterPageHeader } from "@/shared/design-system/shell";

type TaxSummaryActionsProps = {
  dateRange: ReportsPageDateRange;
};

export function TaxSummaryActions({ dateRange }: TaxSummaryActionsProps) {
  return (
    <MasterPageHeader
      className="no-print flex-col items-stretch gap-3 sm:flex-row sm:items-center"
      title="Tax Summary"
      subtitle="Printable accountant summary for the selected reporting period."
      secondaryAction={
        <Link
          href={`/reports?range=${dateRange}`}
          className="admin-btn-secondary inline-flex w-full items-center justify-center text-sm sm:w-auto"
        >
          Back to Reports
        </Link>
      }
      primaryAction={
        <button
          type="button"
          onClick={() => window.print()}
          className="admin-btn-primary inline-flex w-full items-center justify-center text-sm sm:w-auto"
        >
          Print Summary
        </button>
      }
    />
  );
}
