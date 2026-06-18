import { isNorthStarShellEnabled } from "@/lib/beta/north-star-shell";
import type { AccountantSummaryData, ReportsPageDateRange } from "@/shared/types/reports-page";
import {
  MasterContentStack,
  MasterPageCanvas,
  MasterShellPage,
} from "@/shared/design-system/shell";
import { TaxSummaryNorthStarView } from "./north-star-m8/TaxSummaryNorthStarView";
import { TaxSummaryActions } from "./TaxSummaryActions";
import { TaxSummaryReportDocument } from "./TaxSummaryReportDocument";

type TaxSummaryPageViewProps = {
  summary: AccountantSummaryData;
  generatedAt: string;
  dateRange: ReportsPageDateRange;
};

export function TaxSummaryPageView({
  summary,
  generatedAt,
  dateRange,
}: TaxSummaryPageViewProps) {
  if (isNorthStarShellEnabled()) {
    return (
      <TaxSummaryNorthStarView
        summary={summary}
        generatedAt={generatedAt}
        dateRange={dateRange}
      />
    );
  }

  return (
    <MasterShellPage density="compact">
      <MasterPageCanvas width="detail" className="max-w-4xl">
        <MasterContentStack density="compact">
          <TaxSummaryActions dateRange={dateRange} />

          <TaxSummaryReportDocument
            summary={summary}
            generatedAt={generatedAt}
            variant="legacy"
          />
        </MasterContentStack>
      </MasterPageCanvas>
    </MasterShellPage>
  );
}
