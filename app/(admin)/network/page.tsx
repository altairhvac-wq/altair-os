import { redirect } from "next/navigation";
import { isAlphaHardeningEnabled } from "@/lib/beta/alpha-hardening";
import { getActiveCompanyContext } from "@/lib/database/company-context";
import { ComingSoonView } from "@/shared/components/layout/ComingSoonView";
import { UnauthorizedAccessView } from "@/shared/components/layout/UnauthorizedAccessView";
import { NetworkPageView } from "@/shared/components/network/NetworkPageView";

export default async function NetworkPage() {
  const companyContext = await getActiveCompanyContext();

  if (!companyContext) {
    redirect("/setup");
  }

  if (
    !companyContext.permissions.dispatchJobs &&
    !companyContext.permissions.manageCompany
  ) {
    return (
      <UnauthorizedAccessView description="Network access is limited to dispatchers and company admins." />
    );
  }

  if (isAlphaHardeningEnabled()) {
    return (
      <ComingSoonView
        title="Network coming soon"
        description="Subcontractor networking and bid workflows are in development and hidden during the internal alpha."
      />
    );
  }

  return <NetworkPageView />;
}
