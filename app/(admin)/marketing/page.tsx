import { redirect } from "next/navigation";
import { isAiDraftingConfigured, isAiFeaturesEnabled } from "@/lib/ai/env";
import { getCurrentUser } from "@/lib/database/auth";
import { getActiveCompanyContext } from "@/lib/database/company-context";
import { canAccessAdminNavItem } from "@/lib/database/access-control";
import { canAccessPlatformAdmin } from "@/lib/database/platform-admin";
import { hasCompanyRole } from "@/lib/database/types/roles";
import { listMarketingConnectedAccounts } from "@/lib/database/queries/marketing-connected-accounts";
import { listMarketingPosts } from "@/lib/database/queries/marketing-posts";
import { UnauthorizedAccessView } from "@/shared/components/layout/UnauthorizedAccessView";
import { MarketingHubPageView } from "@/shared/components/marketing-hub/MarketingHubPageView";
import { formatFacebookConnectFlashMessage } from "@/shared/types/marketing-connected-account";

type MarketingPageProps = {
  searchParams: Promise<{
    facebook?: string;
    facebook_error?: string;
    pages?: string;
  }>;
};

export default async function MarketingPage({
  searchParams,
}: MarketingPageProps) {
  const [companyContext, user, params] = await Promise.all([
    getActiveCompanyContext(),
    getCurrentUser(),
    searchParams,
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

  const canManageConnectedAccounts = hasCompanyRole(companyContext.role, [
    "owner",
    "admin",
  ]);

  const connectedAccountsFlash = formatFacebookConnectFlashMessage({
    facebook: params.facebook,
    facebookError: params.facebook_error,
    pages: params.pages,
  });

  const isPlatformAdmin = canAccessPlatformAdmin(user);
  const showFounderScreenshotCapture =
    process.env.NODE_ENV === "development" && isPlatformAdmin;

  return (
    <MarketingHubPageView
      initialPosts={posts}
      connectedAccounts={connectedAccounts}
      companyName={companyContext.company.name}
      showFounderMarketing={isPlatformAdmin}
      showFounderScreenshotCapture={showFounderScreenshotCapture}
      aiFeaturesEnabled={isAiFeaturesEnabled()}
      aiDraftingConfigured={isAiDraftingConfigured()}
      canManageConnectedAccounts={canManageConnectedAccounts}
      connectedAccountsFlash={connectedAccountsFlash}
    />
  );
}
