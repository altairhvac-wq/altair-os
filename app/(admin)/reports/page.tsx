import { redirect } from "next/navigation";
import {
  canViewOperationalReports,
  canViewTechnicianRoster,
  getCompanyAccessScope,
} from "@/lib/database/access-control";
import { getCurrentUser } from "@/lib/database/auth";
import { getActiveCompanyContext } from "@/lib/database/company-context";
import { shouldHideDemoPrefixesForDisplay } from "@/lib/database/founder-marketing-display";
import { getReportsPageData } from "@/lib/database/queries/reports";
import { getCachedBusinessSummary } from "@/lib/ai/business-summary-cache";
import { isAiFeaturesEnabled } from "@/lib/ai/env";
import { ReportsPageView } from "@/shared/components/reports/ReportsPageView";
import { UnauthorizedAccessView } from "@/shared/components/layout/UnauthorizedAccessView";
import { stripDemoNamePrefix } from "@/shared/lib/demo-display-name";
import {
  parseReportsPageDateRange,
  type ReportSnapshotRow,
} from "@/shared/types/reports-page";

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

  const access = getCompanyAccessScope(companyContext);

  const data = await getReportsPageData(
    companyContext.company.id,
    companyContext.company.name,
    dateRange,
    {
      showTechnicianPerformance: canViewTechnicianRoster(companyContext),
      showLeadPipeline: access.canManageCustomers,
      timeZone: companyContext.company.timezone,
    },
  );

  // Reports streams its sections, and the client-side demo-prefix stripping
  // (FounderMarketingDisplayContext) was mismatching the server-rendered HTML
  // inside those streamed chunks — a hydration error on every Reports load
  // for the founder account. Strip once here, server-side, so both render
  // passes produce identical text; stripDemoNamePrefix is idempotent, so the
  // client-side formatting becomes a harmless no-op.
  const user = await getCurrentUser();
  if (shouldHideDemoPrefixesForDisplay(user)) {
    const stripRows = (rows: ReportSnapshotRow[]) => {
      for (const row of rows) {
        row.label = stripDemoNamePrefix(row.label);
        if (row.detail) {
          row.detail = stripDemoNamePrefix(row.detail);
        }
      }
    };
    stripRows(data.operationsSnapshot.topCustomers);
    stripRows(data.operationsSnapshot.overdueInvoices);
    stripRows(data.operationsSnapshot.workCompleted);
    stripRows(data.accountantSummary.revenueByCustomer);
  }

  const initialCachedSummary = isAiFeaturesEnabled()
    ? getCachedBusinessSummary(companyContext.company.id, dateRange)
    : null;

  return (
    <ReportsPageView
      data={data}
      aiFeaturesEnabled={isAiFeaturesEnabled()}
      canManageCustomers={access.canManageCustomers}
      initialCachedSummary={initialCachedSummary}
    />
  );
}
