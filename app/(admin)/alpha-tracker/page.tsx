import { redirect } from "next/navigation";
import { getActiveCompanyContext } from "@/lib/database/company-context";
import { listAlphaTrackerItems } from "@/lib/database/queries/alpha-tracker-items";
import { AlphaTrackerPageView } from "@/shared/components/alpha-tracker/AlphaTrackerPageView";
import { UnauthorizedAccessView } from "@/shared/components/layout/UnauthorizedAccessView";

export default async function AlphaTrackerPage() {
  const companyContext = await getActiveCompanyContext();

  if (!companyContext) {
    redirect("/setup");
  }

  if (!companyContext.permissions.manageCompany) {
    return (
      <UnauthorizedAccessView description="Feedback access is limited to company admins." />
    );
  }

  const items = await listAlphaTrackerItems(companyContext.company.id);

  return (
    <AlphaTrackerPageView
      initialItems={items}
      currentUserId={companyContext.user.id}
      canManageCompany={companyContext.permissions.manageCompany}
    />
  );
}
