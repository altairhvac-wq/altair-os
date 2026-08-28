import { createClient } from "@/lib/supabase/server";
import {
  getCompanyReportDailySeries,
  getCompanyReportsSummary,
} from "@/lib/database/queries/reports-aggregates";
import {
  listOpenClockEntriesForCompany,
  listTodayTimeEntriesForCompany,
} from "@/lib/database/queries/time-entries";
import { resolvePreviousReportDateBounds } from "@/shared/lib/reports/report-metrics";
import { buildReportsPageDataFromAggregates } from "@/shared/lib/reports/report-metrics-aggregates";
import {
  attachReportPageSparklinesFromAggregates,
  buildReportChartSeriesFromDailySeries,
} from "@/shared/lib/reports/chart-series-aggregates";
import { getLeadFollowUpDueCutoff } from "@/shared/lib/leads/lead-status";
import { buildShiftTimeTrackingSummary } from "@/shared/lib/time-tracking/shift-time-tracking-summary";
import {
  resolveProfitabilityReportDateBounds,
  resolveReportDateBounds,
} from "@/shared/types/reports";
import type {
  ReportsPageData,
  ReportsPageDateRange,
} from "@/shared/types/reports-page";

async function listTechnicianLaborCostRates(
  companyId: string,
): Promise<Map<string, number>> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("company_memberships")
    .select("user_id, labor_cost_rate_cents")
    .eq("company_id", companyId)
    .eq("status", "active")
    .not("user_id", "is", null);

  if (error) {
    console.error("[listTechnicianLaborCostRates] query failed:", {
      companyId,
      code: error.code,
      message: error.message,
    });
    return new Map();
  }

  const rates = new Map<string, number>();

  for (const row of data ?? []) {
    if (
      row.user_id &&
      row.labor_cost_rate_cents != null &&
      row.labor_cost_rate_cents >= 0
    ) {
      rates.set(row.user_id, row.labor_cost_rate_cents / 100);
    }
  }

  return rates;
}

/**
 * The aging reference date.
 *
 * buildInvoiceAging measured "today" with `toDateOnly(new Date())` using local
 * getFullYear / getMonth / getDate, so the reference is the SERVER's local
 * calendar date. It is resolved here and passed to the aggregate rather than
 * computed in SQL, for the same reason migration 160 takes a follow-up cutoff
 * instead of a time-zone name: one definition of the rule, in TypeScript.
 */
function resolveAgingReferenceDate(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

/**
 * The reports page.
 *
 * ============================== WHAT THIS REPLACED ==============================
 * This loaded twelve datasets with no .limit() -- every invoice, payment,
 * estimate, job, expense, lead, customer and labour entry -- and reduced them
 * through buildReportsPageData. PostgREST caps each of those reads at 1,000
 * rows and reports the cut only in a header nothing reads, so past that ceiling
 * the page rendered real money computed from a fraction of the book.
 *
 * Measured on a scale-seeded tenant of 10,000 invoices:
 *
 *   Outstanding invoices        $992,872   against  $11,304,791
 *   90+ day aging bucket        $0 / none  against  $10,076,347 / 3,598
 *   Sales tax collected         $141,567   against     $353,851
 *   Repeat customer rate             13%   against          73%
 *
 * Every error ran the same way: less debt outstanding, a better collection
 * rate, a cleaner book. And the 90+ bucket read exactly zero because
 * listInvoices ordered created_at desc -- so the rows the ceiling dropped were
 * the oldest, which is the only thing an aging report is for.
 *
 * The counting now happens in the database (migrations 169 and 170) and the
 * shipped builders derive everything else from those counts.
 *
 * ============================== WHAT STILL READS ROWS ==============================
 * The two time-tracking reads. Both are bounded by what they select -- clocks
 * currently open, and today's entries -- and neither grows with the tenant.
 */
export async function getReportsPageData(
  companyId: string,
  companyName: string,
  dateRange: ReportsPageDateRange,
  options: {
    showTechnicianPerformance?: boolean;
    showLeadPipeline?: boolean;
    timeZone?: string;
  } = {},
): Promise<ReportsPageData> {
  const showLeadPipeline = options.showLeadPipeline ?? false;
  const dateBounds =
    resolveReportDateBounds(dateRange) ??
    resolveProfitabilityReportDateBounds(dateRange);

  const [
    summary,
    dailySeries,
    laborCostRates,
    openClockEntries,
    todayTimeEntries,
  ] = await Promise.all([
    getCompanyReportsSummary(companyId, {
      dateBounds,
      previousBounds: resolvePreviousReportDateBounds(dateBounds),
      today: resolveAgingReferenceDate(),
      // The same helper migration 160 was built around: the cutoff is the last
      // instant of today in the company's zone, resolved once here.
      followUpCutoff: getLeadFollowUpDueCutoff(new Date(), options.timeZone),
    }),
    getCompanyReportDailySeries(companyId, dateBounds),
    listTechnicianLaborCostRates(companyId),
    listOpenClockEntriesForCompany(companyId),
    listTodayTimeEntriesForCompany(companyId, options.timeZone),
  ]);

  if (!summary.ok || !summary.data || !dailySeries.ok || !dailySeries.data) {
    // A failed aggregate must not render as a company with no business. The
    // failure is logged and reported by the query layer; returning an empty
    // report here would be indistinguishable from a brand-new tenant, which is
    // the exact confusion the dashboard shadow rollout produced once already.
    // The route's error boundary shows a failure instead.
    throw new Error(
      `[getReportsPageData] reports aggregates unavailable for ${companyId} ` +
        `(summary=${summary.errorCode ?? "ok"}, series=${dailySeries.errorCode ?? "ok"})`,
    );
  }

  const chartSeries = buildReportChartSeriesFromDailySeries(dailySeries.data, {
    dateRange,
  });

  const report = buildReportsPageDataFromAggregates({
    companyName,
    dateRange,
    aggregate: summary.data,
    chartSeries,
    laborCostRates,
    showTechnicianProfitability: options.showTechnicianPerformance ?? true,
    showLeadPipeline,
  });

  const withTimeTracking: ReportsPageData = {
    ...report,
    timeTracking: buildShiftTimeTrackingSummary({
      openClockEntries,
      todayTimeEntries,
      timeZone: options.timeZone,
    }),
  };

  return attachReportPageSparklinesFromAggregates(withTimeTracking, {
    series: dailySeries.data,
    chartSeries,
  });
}
