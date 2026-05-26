import { redirect } from "next/navigation";
import { getActiveCompanyContext } from "@/lib/database/company-context";
import { hasCompanyRole } from "@/lib/database/types/roles";
import { runSystemChecks } from "@/lib/system-check/run-system-checks";
import { UnauthorizedAccessView } from "@/shared/components/layout/UnauthorizedAccessView";
import { SystemCheckPageView } from "@/shared/components/settings/SystemCheckPageView";

export default async function SystemCheckPage() {
  const companyContext = await getActiveCompanyContext();

  if (!companyContext) {
    redirect("/setup");
  }

  if (!hasCompanyRole(companyContext.role, ["owner"])) {
    return (
      <UnauthorizedAccessView
        title="Owner access required"
        description="System checks are limited to company owners during the internal alpha."
      />
    );
  }

  const report = await runSystemChecks();

  return <SystemCheckPageView report={report} />;
}
