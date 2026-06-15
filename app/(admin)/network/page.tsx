/**
 * Network admin route — live V1 referrals + connections UI (`NetworkReferralsPageView`).
 * Uses `network_profiles`, `network_referrals`, and `network_partners` (My Network).
 * See `shared/components/network/README.md`.
 */

import { redirect } from "next/navigation";
import { getActiveCompanyContext } from "@/lib/database/company-context";
import { canAccessAdminNavItem } from "@/lib/database/access-control";
import { listMyNetworkPartners, getNetworkPartnerLinkByLinkedCompanyId } from "@/lib/database/queries/network-partners";
import { repairAcceptedInvitePartnerLinksForCompany } from "@/lib/database/services/network-invite-partner-repair";
import {
  getAcceptedNetworkInviteForCompany,
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
  const canManageNetwork = companyContext.permissions.manageCompany;
  const canManageReceivedReferrals = companyContext.permissions.manageCustomers;

  if (canManageNetwork) {
    await repairAcceptedInvitePartnerLinksForCompany(companyId);
  }

  const [profiles, ownProfileResult, sentReferrals, receivedReferrals, myNetworkPartnersBase, networkInvites, acceptedInvite] =
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
      canManageNetwork
        ? listMyNetworkPartners(companyId)
        : Promise.resolve([]),
      canManageNetwork
        ? listNetworkInvitesForSourceCompany(companyId)
        : Promise.resolve([]),
      getAcceptedNetworkInviteForCompany(companyId),
    ]);

  let myNetworkPartners = myNetworkPartnersBase;

  if (
    canManageNetwork &&
    acceptedInvite?.sourceCompanyId &&
    !myNetworkPartners.some(
      (partner) => partner.linkedCompanyId === acceptedInvite.sourceCompanyId,
    )
  ) {
    const invitePartner = await getNetworkPartnerLinkByLinkedCompanyId(
      companyId,
      acceptedInvite.sourceCompanyId,
    );

    if (
      invitePartner &&
      invitePartner.relationshipStatus === "active"
    ) {
      myNetworkPartners = [...myNetworkPartners, invitePartner];
    }
  }

  return (
    <NetworkReferralsPageView
      initialProfiles={profiles}
      initialOwnProfile={ownProfileResult.profile}
      initialSentReferrals={sentReferrals}
      initialReceivedReferrals={receivedReferrals}
      initialMyNetworkPartners={myNetworkPartners}
      initialNetworkInvites={networkInvites}
      invitedByCompanyName={acceptedInvite?.sourceCompanyName ?? null}
      companyId={companyId}
      canSendReferral={canSendReferral}
      canManageNetwork={canManageNetwork}
      canManageReceivedReferrals={canManageReceivedReferrals}
    />
  );
}
