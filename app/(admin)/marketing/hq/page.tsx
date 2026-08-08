import { redirect } from "next/navigation";
import { isAiDraftingConfigured, isAiFeaturesEnabled } from "@/lib/ai/env";
import { getActiveCompanyContext } from "@/lib/database/company-context";
import { requirePlatformAdmin } from "@/lib/database/platform-admin";
import { listMarketingConnectedAccounts } from "@/lib/database/queries/marketing-connected-accounts";
import { isFacebookOAuthConfigured } from "@/lib/integrations/facebook/env";
import { isIntegrationEncryptionConfigured } from "@/lib/integrations/env";
import { loadMarketingHqContext } from "@/lib/marketing/brand";
import { listMarketingItems, listMarketingRuns } from "@/lib/marketing/store";
import { getFacebookPageInstagramBusinessAccountId } from "@/shared/lib/marketing-facebook-metadata";
import {
  MarketingAiHqPageView,
  type MarketingDistributionStatus,
} from "@/shared/components/marketing-hq/MarketingAiHqPageView";

export default async function MarketingAiHqPage() {
  await requirePlatformAdmin();

  const companyContext = await getActiveCompanyContext();

  if (!companyContext) {
    redirect("/setup");
  }

  const [hqContext, items, runs, connectedAccounts] = await Promise.all([
    loadMarketingHqContext(companyContext.company.id),
    listMarketingItems(companyContext.company.id, { limit: 100 }),
    listMarketingRuns(companyContext.company.id, 20),
    listMarketingConnectedAccounts(companyContext.company.id),
  ]);

  const distribution: MarketingDistributionStatus = {
    encryptionConfigured: isIntegrationEncryptionConfigured(),
    facebookConfigured: isFacebookOAuthConfigured(),
    facebookPages: connectedAccounts
      .filter(
        (account) =>
          account.provider === "facebook" &&
          account.status === "connected" &&
          Boolean(account.providerResourceId?.trim()),
      )
      .map((account) => ({
        id: account.id,
        name:
          account.providerResourceName ??
          account.providerAccountName ??
          "Facebook Page",
        hasInstagram: Boolean(
          getFacebookPageInstagramBusinessAccountId(account.metadata),
        ),
      })),
  };

  return (
    <MarketingAiHqPageView
      config={hqContext.config}
      brandKit={hqContext.brandKit}
      hasConfig={hqContext.hasConfig}
      items={items}
      runs={runs}
      aiFeaturesEnabled={isAiFeaturesEnabled()}
      aiDraftingConfigured={isAiDraftingConfigured()}
      distribution={distribution}
    />
  );
}
