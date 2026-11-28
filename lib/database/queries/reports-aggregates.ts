import { createClient } from "@/lib/supabase/server";
import { captureMonitoredEvent } from "@/lib/operations/monitoring";
import type { ReportsSummaryAggregate } from "@/shared/lib/reports/report-metrics-aggregates";
import type { ReportDailySeries } from "@/shared/lib/reports/chart-series-aggregates";
import type { ProfitabilityReportDateBounds } from "@/shared/types/reports";

/**
 * The two reports aggregates (migrations 169 and 170, given the company's
 * time zone by 221 and 220).
 *
 * Both are SECURITY DEFINER and re-check membership and the reports permission
 * themselves, so these wrappers do not become the security boundary: the RPC is
 * safe to call even if a caller reached it without the page's own gate.
 *
 * ============================== WHY THE RESULT CARRIES ok ==============================
 * A failed RPC must not be indistinguishable from a company with no data. That
 * mistake was made once already, in the dashboard's shadow comparison, where a
 * permission error was reported as agreement between the two paths. So both
 * functions return { data, ok } and the caller decides; a false ok is a
 * deployment fault, not an empty tenant.
 */

type AggregateResult<T> = {
  data: T | null;
  ok: boolean;
  errorCode?: string;
  /**
   * True when a time zone was asked for and the database function does not
   * take one yet: its migration has not run. Not a fault and not reported
   * as one. The caller asks again on the old calendar (UTC days), for BOTH
   * functions, so the two never count different days.
   */
  timeZoneUnsupported?: boolean;
};

/** PostgREST's "no function with these arguments". */
const NO_SUCH_FUNCTION = "PGRST202";

function reportFailure(
  event: string,
  companyId: string,
  error: { code?: string; message: string; hint?: string | null },
) {
  console.error(`[${event}] rpc failed:`, {
    companyId,
    code: error.code,
    message: error.message,
  });

  captureMonitoredEvent({
    event,
    companyId,
    meta: {
      code: error.code,
      // 42501 is a missing grant and PGRST202 is a missing function. Both mean
      // the code shipped ahead of the migration rather than anything being
      // wrong with the data.
      likelyDeploymentFault:
        error.code === "42501" || error.code === "PGRST202",
    },
  });
}

export async function getCompanyReportsSummary(
  companyId: string,
  input: {
    dateBounds: ProfitabilityReportDateBounds;
    previousBounds: ProfitabilityReportDateBounds;
    today: string;
    followUpCutoff: string;
    limit?: number;
    /**
     * The zone a timestamp is turned into a calendar day in (migration 221).
     * The bounds and `today` must be dates on that same calendar. Left out:
     * UTC days, as before.
     *
     * Before migration 221 the function does not take a zone and the call is
     * answered "no such function". That comes back as timeZoneUnsupported
     * and is NOT retried here: the dates this was called with are the
     * company's, and the old calendar has its own.
     */
    timeZone?: string;
  },
): Promise<AggregateResult<ReportsSummaryAggregate>> {
  const supabase = await createClient();
  const timeZone = input.timeZone?.trim();
  const args = {
    p_company_id: companyId,
    p_start_date: input.dateBounds.startDate,
    p_end_date: input.dateBounds.endDate,
    p_prev_start_date: input.previousBounds.startDate,
    p_prev_end_date: input.previousBounds.endDate,
    p_today: input.today,
    p_follow_up_cutoff: input.followUpCutoff,
    p_limit: input.limit ?? 5,
  };

  const { data, error } = await supabase.rpc(
    "get_company_reports_summary",
    timeZone ? { ...args, p_time_zone: timeZone } : args,
  );

  if (error && timeZone && error.code === NO_SUCH_FUNCTION) {
    return {
      data: null,
      ok: false,
      errorCode: error.code,
      timeZoneUnsupported: true,
    };
  }

  if (error) {
    reportFailure("reports.summary_rpc_failed", companyId, error);
    return { data: null, ok: false, errorCode: error.code };
  }

  const aggregate = data as unknown as ReportsSummaryAggregate | null;

  // authorized:false is the function declining a caller who is a member but
  // lacks the reports permission. That is a legitimate answer, not a failure,
  // and the page's own gate should already have caught it.
  if (!aggregate?.authorized) {
    return { data: null, ok: false, errorCode: "unauthorized" };
  }

  return { data: aggregate, ok: true };
}

/**
 * @param options.timeZone the zone a timestamp is turned into a calendar day
 *   in (migration 220). Left out, days are UTC days, as the Reports page has
 *   always counted them. The dashboard passes the company's resolved zone,
 *   so a job finished on the evening of the 31st counts in that month.
 *
 *   Before migration 220 the function does not take a zone: the call is
 *   answered "no such function" (PGRST202), is made again without it, and
 *   the caller gets UTC days, exactly what it got before. That is expected
 *   while a migration is pending, so it is not reported as a failure.
 *
 * @param options.fallBackToUtcDays false: do not make that second call;
 *   answer timeZoneUnsupported instead. The Reports page asks this way,
 *   because it reads this series next to the summary and must put both on
 *   the same calendar, with that calendar's own dates, when either cannot
 *   take a zone. Left out (the dashboard): fall back here, as before.
 */
export async function getCompanyReportDailySeries(
  companyId: string,
  bounds: ProfitabilityReportDateBounds,
  options: { timeZone?: string; fallBackToUtcDays?: boolean } = {},
): Promise<AggregateResult<ReportDailySeries>> {
  const supabase = await createClient();
  const args = {
    p_company_id: companyId,
    p_start_date: bounds.startDate,
    p_end_date: bounds.endDate,
  };
  const timeZone = options.timeZone?.trim();

  let { data, error } = await supabase.rpc(
    "get_company_report_daily_series",
    timeZone ? { ...args, p_time_zone: timeZone } : args,
  );

  if (error && timeZone && error.code === NO_SUCH_FUNCTION) {
    if (options.fallBackToUtcDays === false) {
      return {
        data: null,
        ok: false,
        errorCode: error.code,
        timeZoneUnsupported: true,
      };
    }

    ({ data, error } = await supabase.rpc(
      "get_company_report_daily_series",
      args,
    ));
  }

  if (error) {
    reportFailure("reports.daily_series_rpc_failed", companyId, error);
    return { data: null, ok: false, errorCode: error.code };
  }

  const series = data as unknown as ReportDailySeries | null;

  if (!series?.authorized) {
    return { data: null, ok: false, errorCode: "unauthorized" };
  }

  return { data: series, ok: true };
}
