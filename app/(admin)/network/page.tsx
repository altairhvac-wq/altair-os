import { redirect } from "next/navigation";
import { getActiveCompanyContext } from "@/lib/database/company-context";
import { canAccessAdminNavItem } from "@/lib/database/access-control";
import { UnauthorizedAccessView } from "@/shared/components/layout/UnauthorizedAccessView";
import { NetworkBetaPageView } from "@/shared/components/network/NetworkBetaPageView";

export default async function NetworkPage() {
  const companyContext = await getActiveCompanyContext();

  if (!companyContext) {
    redirect("/setup");
  }

  if (!canAccessAdminNavItem(companyContext, "/network")) {
    return (
      <UnauthorizedAccessView description="Network access is limited to company owners, admins, dispatchers, and office staff." />
    );
  }

  return <NetworkBetaPageView />;
}
