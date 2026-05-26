import { redirect } from "next/navigation";
import { getActiveCompanyContext } from "@/lib/database/company-context";
import { getCompanyExpenseReport } from "@/lib/database/services/reports/expense-report";
import { getCompanyJobActivityReport } from "@/lib/database/services/reports/job-activity-report";
import { getCompanyProfitabilityReport } from "@/lib/database/services/reports/profitability-report";
import { getCompanyRevenueReport } from "@/lib/database/services/reports/revenue-report";
import { getCompanyOfficeReviewQueueReport } from "@/lib/database/services/reports/office-review-queue";
import { getCompanyReportChartSeries } from "@/lib/database/services/reports/report-chart-series";
import { getCompanyTechnicianLaborReport } from "@/lib/database/services/reports/technician-labor-report";
import { AnalyticsPageView } from "@/shared/components/analytics/AnalyticsPageView";
import { parseProfitabilityReportDateRange } from "@/shared/types/reports";

type ReportsPageProps = {
  searchParams: Promise<{ range?: string }>;
};

export default async function ReportsPage({ searchParams }: ReportsPageProps) {
  const companyContext = await getActiveCompanyContext();

  if (!companyContext) {
    redirect("/setup");
  }

  const params = await searchParams;
  const dateRange = parseProfitabilityReportDateRange(params.range);
  const reportOptions = { dateRange };

  const [
    profitabilityReport,
    revenueReport,
    expenseReport,
    jobActivityReport,
    technicianLaborReport,
    officeReviewQueueReport,
    chartSeries,
  ] = await Promise.all([
    getCompanyProfitabilityReport(companyContext.company.id, reportOptions),
    getCompanyRevenueReport(companyContext.company.id, reportOptions),
    getCompanyExpenseReport(companyContext.company.id, reportOptions),
    getCompanyJobActivityReport(companyContext.company.id, reportOptions),
    getCompanyTechnicianLaborReport(companyContext.company.id, reportOptions),
    getCompanyOfficeReviewQueueReport(companyContext.company.id),
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
        officeReviewQueue: officeReviewQueueReport,
      }}
      profitabilityReport={profitabilityReport}
      profitabilityDateRange={dateRange}
    />
  );
}
