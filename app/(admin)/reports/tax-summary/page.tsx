import { redirect } from "next/navigation";
import { canViewOperationalReports } from "@/lib/database/access-control";
import { getActiveCompanyContext } from "@/lib/database/company-context";
import { getReportsPageData } from "@/lib/database/queries/reports";
import { UnauthorizedAccessView } from "@/shared/components/layout/UnauthorizedAccessView";
import { TaxSummaryPageView } from "@/shared/components/reports/TaxSummaryPageView";
import { parseReportsPageDateRange } from "@/shared/types/reports-page";

type TaxSummaryPageProps = {
  searchParams: Promise<{ range?: string }>;
};

export default async function TaxSummaryPage({ searchParams }: TaxSummaryPageProps) {
  const companyContext = await getActiveCompanyContext();

  if (!companyContext) {
    redirect("/setup");
  }

  if (!canViewOperationalReports(companyContext)) {
    return (
      <UnauthorizedAccessView description="Accountant summaries are limited to office, dispatch, and billing roles." />
    );
  }

  const params = await searchParams;
  const dateRange = parseReportsPageDateRange(params.range);

  const data = await getReportsPageData(
    companyContext.company.id,
    companyContext.company.name,
    dateRange,
    {
      showTechnicianPerformance: false,
    },
  );

  return (
    <TaxSummaryPageView
      summary={data.accountantSummary}
      generatedAt={new Date().toISOString()}
      dateRange={dateRange}
    />
  );
}
