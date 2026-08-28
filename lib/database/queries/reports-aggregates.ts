import { createClient } from "@/lib/supabase/server";
import { captureMonitoredEvent } from "@/lib/operations/monitoring";
import type { ReportsSummaryAggregate } from "@/shared/lib/reports/report-metrics-aggregates";
import type { ReportDailySeries } from "@/shared/lib/reports/chart-series-aggregates";
import type { ProfitabilityReportDateBounds } from "@/shared/types/reports";

/**
 * The two reports aggregates (migrations 169 and 170).
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
};

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
  },
): Promise<AggregateResult<ReportsSummaryAggregate>> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("get_company_reports_summary", {
    p_company_id: companyId,
    p_start_date: input.dateBounds.startDate,
    p_end_date: input.dateBounds.endDate,
    p_prev_start_date: input.previousBounds.startDate,
    p_prev_end_date: input.previousBounds.endDate,
    p_today: input.today,
    p_follow_up_cutoff: input.followUpCutoff,
    p_limit: input.limit ?? 5,
  });

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

export async function getCompanyReportDailySeries(
  companyId: string,
  bounds: ProfitabilityReportDateBounds,
): Promise<AggregateResult<ReportDailySeries>> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc(
    "get_company_report_daily_series",
    {
      p_company_id: companyId,
      p_start_date: bounds.startDate,
      p_end_date: bounds.endDate,
    },
  );

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
