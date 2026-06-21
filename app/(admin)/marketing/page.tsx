import { redirect } from "next/navigation";
import { getActiveCompanyContext } from "@/lib/database/company-context";
import { canAccessAdminNavItem } from "@/lib/database/access-control";
import { listMarketingPosts } from "@/lib/database/queries/marketing-posts";
import { UnauthorizedAccessView } from "@/shared/components/layout/UnauthorizedAccessView";
import { MarketingHubPageView } from "@/shared/components/marketing-hub/MarketingHubPageView";

export default async function MarketingPage() {
  const companyContext = await getActiveCompanyContext();

  if (!companyContext) {
    redirect("/setup");
  }

  if (!canAccessAdminNavItem(companyContext, "/marketing")) {
    return (
      <UnauthorizedAccessView description="Marketing posts are limited to company owners, admins, and dispatchers." />
    );
  }

  const posts = await listMarketingPosts(companyContext.company.id);

  return <MarketingHubPageView initialPosts={posts} companyName={companyContext.company.name} />;
}
