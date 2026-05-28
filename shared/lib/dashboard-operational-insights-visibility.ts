import type { DailyOperationsSummary } from "@/shared/types/daily-operations-summary";

const BILLING_SENSITIVE_HIGHLIGHT_IDS = new Set([
  "material-cost-exceeds-collected",
  "payments-today",
]);

/**
 * Redacts billing-sensitive operational insight highlights for roles without
 * billing access while preserving operational queue and pipeline signals.
 */
export function filterDailyOperationsSummaryForBillingAccess(
  summary: DailyOperationsSummary,
  canViewBilling: boolean,
): DailyOperationsSummary {
  if (canViewBilling) {
    return summary;
  }

  return {
    ...summary,
    highlights: summary.highlights.filter(
      (highlight) =>
        highlight.category !== "revenue" &&
        !BILLING_SENSITIVE_HIGHLIGHT_IDS.has(highlight.id),
    ),
  };
}
