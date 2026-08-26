import { redirect } from "next/navigation";
import { canAccessAdminNavItem } from "@/lib/database/access-control";
import { getActiveCompanyContext } from "@/lib/database/company-context";
import { listAlphaTrackerItems } from "@/lib/database/queries/alpha-tracker-items";
import { AlphaTrackerPageView } from "@/shared/components/alpha-tracker/AlphaTrackerPageView";
import { UnauthorizedAccessView } from "@/shared/components/layout/UnauthorizedAccessView";

export default async function AlphaTrackerPage() {
  const companyContext = await getActiveCompanyContext();

  if (!companyContext) {
    redirect("/setup");
  }

  // Internal-only surface: platform admin AND company admin. Mirrors
  // canAccessAdminNavItem(context, "/alpha-tracker") so hiding the nav entry
  // and blocking the route cannot drift apart.
  if (!canAccessAdminNavItem(companyContext, "/alpha-tracker")) {
    return (
      <UnauthorizedAccessView description="The alpha tracker is an internal Altair surface." />
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
