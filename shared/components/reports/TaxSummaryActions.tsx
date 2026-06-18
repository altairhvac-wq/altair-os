"use client";

import { MasterPageHeader } from "@/shared/design-system/shell";
import type { ReportsPageDateRange } from "@/shared/types/reports-page";
import { TaxSummaryBackLink, TaxSummaryPrintButton } from "./TaxSummaryHeaderActions";

type TaxSummaryActionsProps = {
  dateRange: ReportsPageDateRange;
};

export function TaxSummaryActions({ dateRange }: TaxSummaryActionsProps) {
  return (
    <MasterPageHeader
      className="no-print flex-col items-stretch gap-3 sm:flex-row sm:items-center"
      title="Tax Summary"
      subtitle="Printable accountant summary for the selected reporting period."
      density="compact"
      secondaryAction={<TaxSummaryBackLink dateRange={dateRange} />}
      primaryAction={<TaxSummaryPrintButton />}
    />
  );
}
