import {
  MasterContentStack,
  MasterPageHeader,
  MasterShellPage,
} from "@/shared/design-system/shell";
import { northStarListTokens as lt } from "@/shared/design-system/north-star/tokens";
import type { AccountantSummaryData, ReportsPageDateRange } from "@/shared/types/reports-page";
import { TaxSummaryBackLink, TaxSummaryPrintButton } from "../TaxSummaryHeaderActions";
import { TaxSummaryReportDocument } from "../TaxSummaryReportDocument";

export type TaxSummaryNorthStarViewProps = {
  summary: AccountantSummaryData;
  generatedAt: string;
  dateRange: ReportsPageDateRange;
};

export function TaxSummaryNorthStarView({
  summary,
  generatedAt,
  dateRange,
}: TaxSummaryNorthStarViewProps) {
  return (
    <MasterShellPage density="compact" className={lt.pageCanvas}>
      <MasterPageHeader
        eyebrow="Bookkeeping report"
        title="Tax Summary"
        subtitle="Printable accountant summary for bookkeeping and tax review."
        density="compact"
        surfaceVariant="northStar"
        className={`no-print north-star-reports-page-header north-star-tax-summary-page-header ${lt.pageHeader}`}
        eyebrowClassName={lt.pageHeaderEyebrow}
        titleClassName={lt.pageHeaderTitle}
        subtitleClassName={lt.pageHeaderSubtitle}
        secondaryAction={
          <TaxSummaryBackLink dateRange={dateRange} variant="northStar" />
        }
        primaryAction={<TaxSummaryPrintButton variant="northStar" />}
      />

      <MasterContentStack
        density="compact"
        className="min-w-0 px-3 pb-5 sm:px-3.5 lg:px-5 lg:pb-6"
      >
        <div className="mx-auto w-full max-w-5xl">
          <TaxSummaryReportDocument
            summary={summary}
            generatedAt={generatedAt}
            variant="northStar"
          />
        </div>
      </MasterContentStack>
    </MasterShellPage>
  );
}
