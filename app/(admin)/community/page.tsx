import type { Metadata } from "next";
/**
 * Community admin route (`/community`) — Altair Community orientation shell
 * over the existing Network data/workflows (`NetworkReferralsPageView`).
 * Canonical route per ALTAIR_ARCHITECTURE.md (one id drives route + label);
 * the legacy `/network` route redirects here.
 * Uses `network_profiles`, `network_referrals`, and `network_partners`.
 * See `shared/components/network/README.md`.
 */

import { redirect } from "next/navigation";
import { getActiveCompanyContext } from "@/lib/database/company-context";
import { canAccessAdminNavItem } from "@/lib/database/access-control";
import { listMyNetworkPartners } from "@/lib/database/queries/network-partners";
import { repairAcceptedInvitePartnerLinksForCompany } from "@/lib/database/services/network-invite-partner-repair";
import {
  getAcceptedNetworkInviteForCompany,
  listIncomingNetworkInvitesForUser,
  listNetworkInvitesForSourceCompany,
} from "@/lib/database/queries/network-invites";
import {
  ensureCompanyNetworkProfile,
  listVisibleNetworkProfiles,
} from "@/lib/database/queries/network-profiles";
import {
  listReceivedNetworkReferrals,
  listSentNetworkReferrals,
} from "@/lib/database/queries/network-referrals";
import { getNetworkReferralTrustStatsByProfileId } from "@/lib/database/queries/network-referral-trust";
import {
  listMyNetworkHelpRequests,
  listOpenNetworkHelpRequests,
} from "@/lib/database/queries/network-help-requests";
import { UnauthorizedAccessView } from "@/shared/components/layout/UnauthorizedAccessView";
import { NetworkReferralsPageView } from "@/shared/components/network/NetworkReferralsPageView";

export const metadata: Metadata = {
  title: "Community",
};

export default async function CommunityPage() {
  const companyContext = await getActiveCompanyContext();

  if (!companyContext) {
    redirect("/setup");
  }

  if (!canAccessAdminNavItem(companyContext, "/community")) {
    return (
      <UnauthorizedAccessView description="Community access is limited to company owners, admins, dispatchers, and office staff." />
    );
  }

  const companyId = companyContext.company.id;
  const canSendReferral = companyContext.permissions.manageCompany;
  const canManageNetwork = companyContext.permissions.manageCompany;
  const canManageReceivedReferrals = companyContext.permissions.manageCustomers;

  if (canManageNetwork) {
    await repairAcceptedInvitePartnerLinksForCompany(companyId);
  }

  const canManageHelpRequests = canSendReferral || canManageReceivedReferrals;

  const [
    profiles,
    ownProfileResult,
    sentReferrals,
    receivedReferrals,
    myNetworkPartners,
    networkInvites,
    acceptedInvite,
    incomingNetworkInvites,
    openHelpRequests,
    myHelpRequests,
  ] = await Promise.all([
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
      canManageNetwork
        ? listMyNetworkPartners(companyId)
        : Promise.resolve([]),
      canManageNetwork
        ? listNetworkInvitesForSourceCompany(companyId)
        : Promise.resolve([]),
      getAcceptedNetworkInviteForCompany(companyId),
      listIncomingNetworkInvitesForUser(companyId),
      canManageHelpRequests
        ? listOpenNetworkHelpRequests(companyId)
        : Promise.resolve([]),
      canManageHelpRequests
        ? listMyNetworkHelpRequests(companyId)
        : Promise.resolve([]),
    ]);

  // Computed trust metrics for the directory profiles on screen (aggregate
  // RPC, visible profiles only — see migration 137).
  const trustStats = canSendReferral
    ? await getNetworkReferralTrustStatsByProfileId(
        profiles.map((profile) => profile.id),
      )
    : {};

  return (
    <NetworkReferralsPageView
      initialProfiles={profiles}
      initialTrustStats={trustStats}
      initialOwnProfile={ownProfileResult.profile}
      initialSentReferrals={sentReferrals}
      initialReceivedReferrals={receivedReferrals}
      initialMyNetworkPartners={myNetworkPartners}
      initialNetworkInvites={networkInvites}
      initialIncomingNetworkInvites={incomingNetworkInvites}
      initialOpenHelpRequests={openHelpRequests}
      initialMyHelpRequests={myHelpRequests}
      invitedByCompanyName={acceptedInvite?.sourceCompanyName ?? null}
      companyId={companyId}
      canSendReferral={canSendReferral}
      canManageNetwork={canManageNetwork}
      canManageReceivedReferrals={canManageReceivedReferrals}
    />
  );
}
