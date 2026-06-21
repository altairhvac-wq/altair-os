import { redirect } from "next/navigation";
import { isAiDraftingConfigured, isAiFeaturesEnabled } from "@/lib/ai/env";
import { getCurrentUser } from "@/lib/database/auth";
import { getActiveCompanyContext } from "@/lib/database/company-context";
import { canAccessAdminNavItem } from "@/lib/database/access-control";
import { canAccessPlatformAdmin } from "@/lib/database/platform-admin";
import { listMarketingConnectedAccounts } from "@/lib/database/queries/marketing-connected-accounts";
import { listMarketingPosts } from "@/lib/database/queries/marketing-posts";
import { UnauthorizedAccessView } from "@/shared/components/layout/UnauthorizedAccessView";
import { MarketingHubPageView } from "@/shared/components/marketing-hub/MarketingHubPageView";

export default async function MarketingPage() {
  const [companyContext, user] = await Promise.all([
    getActiveCompanyContext(),
    getCurrentUser(),
  ]);

  if (!companyContext) {
    redirect("/setup");
  }

  if (!canAccessAdminNavItem(companyContext, "/marketing")) {
    return (
      <UnauthorizedAccessView description="Marketing posts are limited to company owners, admins, and dispatchers." />
    );
  }

  const [posts, connectedAccounts] = await Promise.all([
    listMarketingPosts(companyContext.company.id),
    listMarketingConnectedAccounts(companyContext.company.id),
  ]);

  return (
    <MarketingHubPageView
      initialPosts={posts}
      connectedAccounts={connectedAccounts}
      companyName={companyContext.company.name}
      showFounderMarketing={canAccessPlatformAdmin(user)}
      aiFeaturesEnabled={isAiFeaturesEnabled()}
      aiDraftingConfigured={isAiDraftingConfigured()}
    />
  );
}
