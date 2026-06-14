/**
 * Network admin route — live V1 referrals UI (`NetworkReferralsPageView`).
 * Uses `network_profiles` + `network_referrals` only. Do not wire `NetworkPageView`
 * (removed mock partner CRM). See `shared/components/network/README.md`.
 */

import { redirect } from "next/navigation";
import { getActiveCompanyContext } from "@/lib/database/company-context";
import { canAccessAdminNavItem } from "@/lib/database/access-control";
import {
  ensureCompanyNetworkProfile,
  listVisibleNetworkProfiles,
} from "@/lib/database/queries/network-profiles";
import {
  listReceivedNetworkReferrals,
  listSentNetworkReferrals,
} from "@/lib/database/queries/network-referrals";
import { UnauthorizedAccessView } from "@/shared/components/layout/UnauthorizedAccessView";
import { NetworkReferralsPageView } from "@/shared/components/network/NetworkReferralsPageView";

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

  const companyId = companyContext.company.id;
  const canSendReferral = companyContext.permissions.manageCompany;
  const canManageReceivedReferrals = companyContext.permissions.manageCustomers;

  const [profiles, ownProfileResult, sentReferrals, receivedReferrals] =
    await Promise.all([
      canSendReferral ? listVisibleNetworkProfiles(companyId) : Promise.resolve([]),
      canSendReferral
        ? ensureCompanyNetworkProfile(companyId, companyContext.company.name)
        : Promise.resolve({ profile: null, error: null }),
      canSendReferral
        ? listSentNetworkReferrals(companyId)
        : Promise.resolve([]),
      canManageReceivedReferrals
        ? listReceivedNetworkReferrals(companyId)
        : Promise.resolve([]),
    ]);

  return (
    <NetworkReferralsPageView
      initialProfiles={profiles}
      initialOwnProfile={ownProfileResult.profile}
      initialSentReferrals={sentReferrals}
      initialReceivedReferrals={receivedReferrals}
      canSendReferral={canSendReferral}
      canManageReceivedReferrals={canManageReceivedReferrals}
    />
  );
}
