import { redirect } from "next/navigation";
import { canViewOperationalReports } from "@/lib/database/access-control";
import { getActiveCompanyContext } from "@/lib/database/company-context";
import { getReportsFoundationData } from "@/lib/database/queries/reports";
import { ReportsFoundationView } from "@/shared/components/reports/ReportsFoundationView";
import { UnauthorizedAccessView } from "@/shared/components/layout/UnauthorizedAccessView";

export default async function ReportsPage() {
  const companyContext = await getActiveCompanyContext();

  if (!companyContext) {
    redirect("/setup");
  }

  if (!canViewOperationalReports(companyContext)) {
    return (
      <UnauthorizedAccessView description="Reports are limited to office, dispatch, and billing roles." />
    );
  }

  const data = await getReportsFoundationData(
    companyContext.company.id,
    companyContext.company.timezone,
  );

  return <ReportsFoundationView data={data} />;
}
