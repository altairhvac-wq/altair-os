import { redirect } from "next/navigation";
import { getActiveCompanyContext } from "@/lib/database/company-context";
import { listAlphaTrackerItems } from "@/lib/database/queries/alpha-tracker-items";
import { AlphaTrackerPageView } from "@/shared/components/alpha-tracker/AlphaTrackerPageView";

export default async function AlphaTrackerPage() {
  const companyContext = await getActiveCompanyContext();

  if (!companyContext) {
    redirect("/setup");
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
