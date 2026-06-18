"use client";

import Link from "next/link";
import { Printer } from "lucide-react";
import {
  masterListPagePrimaryActionClass,
  masterSecondaryActionClass,
} from "@/shared/design-system/shell";
import { northStarListTokens as lt } from "@/shared/design-system/north-star/tokens";
import type { ReportsPageDateRange } from "@/shared/types/reports-page";
import {
  isNorthStarReportSurface,
  type ReportSurfaceVariant,
} from "./report-surface-variant";

type TaxSummaryHeaderActionsProps = {
  dateRange: ReportsPageDateRange;
  variant?: ReportSurfaceVariant;
};

export function TaxSummaryBackLink({
  dateRange,
  variant = "legacy",
}: TaxSummaryHeaderActionsProps) {
  const northStar = isNorthStarReportSurface(variant);

  return (
    <Link
      href={`/reports?range=${dateRange}`}
      className={
        northStar
          ? `north-star-reports-secondary-action ${lt.secondaryAction} justify-center sm:justify-start`
          : `${masterSecondaryActionClass} justify-center sm:justify-start`
      }
    >
      Back to Reports
    </Link>
  );
}

export function TaxSummaryPrintButton({
  variant = "legacy",
}: Pick<TaxSummaryHeaderActionsProps, "variant">) {
  const northStar = isNorthStarReportSurface(variant);

  return (
    <button
      type="button"
      onClick={() => window.print()}
      className={
        northStar
          ? `north-star-reports-primary-action ${lt.primaryAction} justify-center sm:justify-start`
          : `${masterListPagePrimaryActionClass} justify-center sm:justify-start`
      }
    >
      {northStar ? (
        <Printer className="h-4 w-4" aria-hidden="true" />
      ) : null}
      Print Summary
    </button>
  );
}
