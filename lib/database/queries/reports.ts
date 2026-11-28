import { createClient } from "@/lib/supabase/server";
import {
  getCompanyReportDailySeries,
  getCompanyReportsSummary,
} from "@/lib/database/queries/reports-aggregates";
import {
  listOpenClockEntriesForCompany,
  listTodayTimeEntriesForCompany,
} from "@/lib/database/queries/time-entries";
import { loadOnReportDayBasis } from "@/shared/lib/reports/report-day-basis";
import { resolvePreviousReportDateBounds } from "@/shared/lib/reports/report-metrics";
import { buildReportsPageDataFromAggregates } from "@/shared/lib/reports/report-metrics-aggregates";
import {
  attachReportPageSparklinesFromAggregates,
  buildReportChartSeriesFromDailySeries,
} from "@/shared/lib/reports/chart-series-aggregates";
import { getLeadFollowUpDueCutoff } from "@/shared/lib/leads/lead-status";
import { buildShiftTimeTrackingSummary } from "@/shared/lib/time-tracking/shift-time-tracking-summary";
import {
  resolveReportPageDateBounds,
  type ReportDayBasis,
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
 * The two aggregates, read on one calendar.
 *
 * ============================== WHERE A MOMENT BECOMES A DAY ==============================
 * Everything on the Reports page that turns a timestamp into a day, or asks
 * what today is, goes through the basis handed in here:
 *
 *   the period              "last 30 days" ends on basis.today
 *   the period before       the same length, ending the day before
 *   the aging reference     basis.today (it was the server's local date)
 *   the summary function    p_time_zone = basis.timeZone (migration 221)
 *   the per-day series      p_time_zone = basis.timeZone (migration 220)
 *
 * The dates are still worked out here and passed in, rather than computed
 * in SQL, for the reason migration 160 takes a follow-up cutoff: one
 * definition of the rule, in TypeScript.
 *
 * With a zone, neither read falls back by itself: if either function cannot
 * take a zone yet, the result says so and loadOnReportDayBasis reads both
 * again on the old calendar, with the old calendar's own dates.
 */
async function loadReportAggregates(
  companyId: string,
  dateRange: ReportsPageDateRange,
  basis: ReportDayBasis,
  followUpCutoff: string,
) {
  const dateBounds = resolveReportPageDateBounds(dateRange, basis);
  const timeZone = basis.timeZone ?? undefined;

  const [summary, dailySeries] = await Promise.all([
    getCompanyReportsSummary(companyId, {
      dateBounds,
      previousBounds: resolvePreviousReportDateBounds(dateBounds),
      today: basis.today,
      followUpCutoff,
      timeZone,
    }),
    getCompanyReportDailySeries(companyId, dateBounds, {
      timeZone,
      fallBackToUtcDays: false,
    }),
  ]);

  return {
    basis,
    summary,
    dailySeries,
    timeZoneUnsupported: Boolean(
      summary.timeZoneUnsupported || dailySeries.timeZoneUnsupported,
    ),
  };
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
 * ============================== WHOSE DAYS ==============================
 * The company's. options.timeZone is the company's resolved zone
 * (companyContext.company.timezone, used as it is), and the figures, the
 * charts and the sparklines all count a job finished at 9:30 pm on the 31st
 * on the 31st. Until migrations 220 and 221 have both run the whole page
 * counts UTC days instead, as it always did; see loadReportAggregates.
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
  // One "now" for every date on the page, so a request that straddles
  // midnight cannot put the period and the aging reference on different days.
  const now = new Date();
  // The same helper migration 160 was built around: the cutoff is the last
  // instant of today in the company's zone, resolved once here. It was
  // already the company's zone and does not depend on the day basis.
  const followUpCutoff = getLeadFollowUpDueCutoff(now, options.timeZone);

  const [aggregates, laborCostRates, openClockEntries, todayTimeEntries] =
    await Promise.all([
      loadOnReportDayBasis(
        options.timeZone,
        (basis) =>
          loadReportAggregates(companyId, dateRange, basis, followUpCutoff),
        now,
      ),
      listTechnicianLaborCostRates(companyId),
      listOpenClockEntriesForCompany(companyId),
      listTodayTimeEntriesForCompany(companyId, options.timeZone),
    ]);
  // The basis the aggregates were ACTUALLY counted on, which is the old one
  // when the database could not take a zone. Everything below uses it.
  const { basis: dayBasis, summary, dailySeries } = aggregates;

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
    dayBasis,
  });

  const report = buildReportsPageDataFromAggregates({
    companyName,
    dateRange,
    aggregate: summary.data,
    chartSeries,
    dayBasis,
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
