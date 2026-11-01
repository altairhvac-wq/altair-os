import "server-only";

import { getCompanyAccessScope } from "@/lib/database/access-control";
import { getDocumentQueueMetrics } from "@/lib/database/queries/list-pages";
import { getCompanyReportDailySeries } from "@/lib/database/queries/reports-aggregates";
import type { ActiveCompanyContext } from "@/lib/database/types";
import {
  buildDashboardPerformance,
  resolvePerformanceWindow,
} from "@/shared/lib/dashboard-performance";
import { getDateOnlyInTimeZone } from "@/shared/lib/datetime";
import type {
  DashboardOverviewExtras,
  DashboardPerformance,
} from "@/shared/types/dashboard-overview";

/**
 * The two reads the overview dashboard needs beyond getDashboardData.
 *
 * Both are SQL aggregates that already exist for other pages: the Sales hub's
 * per-queue counts and money (migration 161) and the reports per-day series
 * (migration 170). Neither loads a whole book, and both RPCs re-check the
 * caller's membership and permission themselves. A failure degrades one card
 * to its empty state rather than taking the dashboard down.
 */
export async function getDashboardOverviewExtras(
  context: ActiveCompanyContext,
): Promise<DashboardOverviewExtras> {
  const access = getCompanyAccessScope(context);
  const companyId = context.company.id;

  const [queueMetrics, performance] = await Promise.all([
    access.canViewBilling
      ? getDocumentQueueMetrics(companyId)
      : Promise.resolve(null),
    access.canViewOperationalReports
      ? loadPerformance(companyId, context.company.timezone)
      : Promise.resolve(null),
  ]);

  return { queueMetrics, performance };
}

async function loadPerformance(
  companyId: string,
  timeZone: string,
): Promise<DashboardPerformance | null> {
  const today = getDateOnlyInTimeZone(new Date(), timeZone);
  const window = resolvePerformanceWindow(today);
  const result = await getCompanyReportDailySeries(companyId, {
    startDate: window.startDate,
    endDate: window.endDate,
  });

  if (!result.ok || !result.data) {
    return null;
  }

  return buildDashboardPerformance(result.data, today);
}
