import { getDailyOperationsSummary } from "@/lib/database/services/operations/daily-operations-summary";
import { getCompanyOfficeReviewQueueReport } from "@/lib/database/services/reports/office-review-queue";
import {
  buildOperationalHealthReportFromOfficeQueue,
  type OperationalHealthReport,
} from "@/shared/types/operational-health-report";

/**
 * Read-only company operational health score aggregated from existing report
 * services. Does not mutate queue, profitability, invoice, or event logic.
 *
 * TODO: AI operational coaching from contributingFactors and areaScores.
 * TODO: Predictive operational risk models using historical score snapshots.
 * TODO: Staffing-aware health scoring normalized by office headcount.
 * TODO: Benchmarking operational health across companies in a portfolio.
 * TODO: Forecasting backlog growth from resolution vs inflow rates.
 */
export async function getCompanyOperationalHealthReport(
  companyId: string,
): Promise<OperationalHealthReport> {
  const [officeReviewQueue, dailySummary] = await Promise.all([
    getCompanyOfficeReviewQueueReport(companyId),
    getDailyOperationsSummary(companyId),
  ]);

  const { profitabilityWarnings } = dailySummary.sections;

  return buildOperationalHealthReportFromOfficeQueue(officeReviewQueue, {
    jobsWithWarnings: profitabilityWarnings.jobsWithWarnings,
    materialCostExceedsCollectedCount:
      profitabilityWarnings.materialCostExceedsCollectedCount,
  });
}
