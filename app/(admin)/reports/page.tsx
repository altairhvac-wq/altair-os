import { redirect } from "next/navigation";
import { canViewOperationalReports } from "@/lib/database/access-control";
import { getActiveCompanyContext } from "@/lib/database/company-context";
import { getCompanyExpenseReport } from "@/lib/database/services/reports/expense-report";
import { getCompanyJobActivityReport } from "@/lib/database/services/reports/job-activity-report";
import { getCompanyProfitabilityReport } from "@/lib/database/services/reports/profitability-report";
import { getCompanyRevenueReport } from "@/lib/database/services/reports/revenue-report";
import { getCompanyOfficeReviewQueueReport } from "@/lib/database/services/reports/office-review-queue";
import { getCompanyOperationalHealthReport } from "@/lib/database/services/reports/operational-health-report";
import { getCompanyReportChartSeries } from "@/lib/database/services/reports/report-chart-series";
import { getCompanyTechnicianLaborReport } from "@/lib/database/services/reports/technician-labor-report";
import { AnalyticsPageView } from "@/shared/components/analytics/AnalyticsPageView";
import { UnauthorizedAccessView } from "@/shared/components/layout/UnauthorizedAccessView";
import { parseProfitabilityReportDateRange } from "@/shared/types/reports";
import { parseOfficeReviewQueueFilter } from "@/shared/types/office-review-queue";

type ReportsPageProps = {
  searchParams: Promise<{ range?: string; queue?: string }>;
};

export default async function ReportsPage({ searchParams }: ReportsPageProps) {
  const companyContext = await getActiveCompanyContext();

  if (!companyContext) {
    redirect("/setup");
  }

  if (!canViewOperationalReports(companyContext)) {
    return (
      <UnauthorizedAccessView description="Reports and analytics are limited to office, dispatch, and billing roles." />
    );
  }

  const params = await searchParams;
  const dateRange = parseProfitabilityReportDateRange(params.range);
  const officeReviewQueueFilter = parseOfficeReviewQueueFilter(params.queue);
  const reportOptions = { dateRange };

  const [
    profitabilityReport,
    revenueReport,
    expenseReport,
    jobActivityReport,
    technicianLaborReport,
    officeReviewQueueReport,
    operationalHealthReport,
    chartSeries,
  ] = await Promise.all([
    getCompanyProfitabilityReport(companyContext.company.id, reportOptions),
    getCompanyRevenueReport(companyContext.company.id, reportOptions),
    getCompanyExpenseReport(companyContext.company.id, reportOptions),
    getCompanyJobActivityReport(companyContext.company.id, reportOptions),
    getCompanyTechnicianLaborReport(companyContext.company.id, reportOptions),
    getCompanyOfficeReviewQueueReport(companyContext.company.id),
    getCompanyOperationalHealthReport(companyContext.company.id),
    getCompanyReportChartSeries(companyContext.company.id, reportOptions),
  ]);

  return (
    <AnalyticsPageView
      chartSeries={chartSeries}
      operationalReports={{
        revenue: revenueReport,
        expenses: expenseReport,
        jobs: jobActivityReport,
        labor: technicianLaborReport,
        operationalHealth: operationalHealthReport,
        officeReviewQueue: officeReviewQueueReport,
      }}
      profitabilityReport={profitabilityReport}
      profitabilityDateRange={dateRange}
      officeReviewQueueFilter={officeReviewQueueFilter}
    />
  );
}
