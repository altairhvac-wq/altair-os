import { redirect } from "next/navigation";
import {
  canViewOperationalReports,
  canViewTechnicianRoster,
} from "@/lib/database/access-control";
import { getActiveCompanyContext } from "@/lib/database/company-context";
import { getReportsPageData } from "@/lib/database/queries/reports";
import { getCachedBusinessSummary } from "@/lib/ai/business-summary-cache";
import { isAiFeaturesEnabled } from "@/lib/ai/env";
import { ReportsPageView } from "@/shared/components/reports/ReportsPageView";
import { UnauthorizedAccessView } from "@/shared/components/layout/UnauthorizedAccessView";
import { parseReportsPageDateRange } from "@/shared/types/reports-page";

type ReportsPageProps = {
  searchParams: Promise<{ range?: string }>;
};

export default async function ReportsPage({ searchParams }: ReportsPageProps) {
  const companyContext = await getActiveCompanyContext();

  if (!companyContext) {
    redirect("/setup");
  }

  if (!canViewOperationalReports(companyContext)) {
    return (
      <UnauthorizedAccessView description="Reports are limited to office, dispatch, and billing roles." />
    );
  }

  const params = await searchParams;
  const dateRange = parseReportsPageDateRange(params.range);

  const data = await getReportsPageData(
    companyContext.company.id,
    companyContext.company.name,
    dateRange,
    {
      showTechnicianPerformance: canViewTechnicianRoster(companyContext),
    },
  );

  const initialCachedSummary = isAiFeaturesEnabled()
    ? getCachedBusinessSummary(companyContext.company.id, dateRange)
    : null;

  return (
    <ReportsPageView
      data={data}
      aiFeaturesEnabled={isAiFeaturesEnabled()}
      initialCachedSummary={initialCachedSummary}
    />
  );
}
