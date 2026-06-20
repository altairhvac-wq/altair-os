/**
 * Types for Trusted Network Invitations V1 (`network_invites`).
 *
 * Invitations let companies invite contractors to join Altair; accepted signups
 * auto-create trusted partner links in `network_partners`.
 */

import type { NetworkInviteStatus } from "@/lib/database/types/enums";
import type { TradeType } from "@/shared/types/network";
import type { NetworkPartner } from "@/shared/types/network-partner";
import type { NetworkProfile } from "@/shared/types/network-referral";

export type NetworkInvite = {
  id: string;
  sourceCompanyId: string;
  sourceUserId: string;
  invitedCompanyName: string;
  invitedContactName: string;
  invitedEmail: string;
  invitedPhone: string;
  tradeCategory: TradeType;
  personalMessage?: string;
  status: NetworkInviteStatus;
  acceptedCompanyId?: string;
  acceptedUserId?: string;
  createdAt: string;
  acceptedAt?: string;
  expiresAt: string;
  sourceCompanyName?: string;
  inviteUrl?: string;
};

/** Pending invite addressed to the signed-in user's email (in-platform acceptance). */
export type IncomingNetworkInvite = {
  id: string;
  sourceCompanyId: string;
  sourceCompanyName: string;
  invitedCompanyName: string;
  invitedContactName: string;
  invitedEmail: string;
  tradeCategory: TradeType;
  personalMessage?: string;
  createdAt: string;
  expiresAt: string;
};

export type NetworkInviteFormData = {
  invitedCompanyName: string;
  invitedContactName: string;
  invitedEmail: string;
  invitedPhone: string;
  tradeCategory: TradeType;
  personalMessage: string;
};

export type PublicNetworkInvitePreview = {
  state: "valid" | "accepted" | "expired" | "cancelled" | "invalid";
  sourceCompanyName?: string;
  invitedCompanyName?: string;
  invitedContactName?: string;
  invitedEmail?: string;
  tradeCategory?: TradeType;
  personalMessage?: string;
};

export const NETWORK_INVITE_STATUS_OPTIONS: {
  value: NetworkInviteStatus;
  label: string;
}[] = [
  { value: "pending", label: "Pending" },
  { value: "accepted", label: "Accepted" },
  { value: "expired", label: "Expired" },
  { value: "cancelled", label: "Cancelled" },
];

export const NETWORK_INVITE_TRADE_OPTIONS: {
  value: TradeType;
  label: string;
}[] = [
  { value: "HVAC", label: "HVAC" },
  { value: "Plumbing", label: "Plumbing" },
  { value: "Electrical", label: "Electrical" },
  { value: "Roofing", label: "Roofing" },
  { value: "General Contracting", label: "General Contracting" },
  { value: "Landscaping", label: "Landscaping" },
  { value: "Painting", label: "Painting" },
];

export type NetworkInvitationsTab = "pending" | "accepted" | "expired";

export const NETWORK_INVITATIONS_TAB_OPTIONS: {
  value: NetworkInvitationsTab;
  label: string;
}[] = [
  { value: "pending", label: "Pending" },
  { value: "accepted", label: "Accepted" },
  { value: "expired", label: "Expired" },
];

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeNetworkInviteFormData(
  data: NetworkInviteFormData,
): NetworkInviteFormData {
  return {
    invitedCompanyName: data.invitedCompanyName.trim(),
    invitedContactName: data.invitedContactName.trim(),
    invitedEmail: data.invitedEmail.trim(),
    invitedPhone: data.invitedPhone.trim(),
    tradeCategory: data.tradeCategory,
    personalMessage: data.personalMessage.trim(),
  };
}

export function validateNetworkInviteFormData(
  data: NetworkInviteFormData,
): string | null {
  if (!data.invitedCompanyName) {
    return "Company name is required.";
  }

  if (!data.invitedContactName) {
    return "Contact name is required.";
  }

  if (!data.invitedEmail) {
    return "Email address is required.";
  }

  if (!EMAIL_PATTERN.test(data.invitedEmail)) {
    return "Enter a valid email address.";
  }

  return null;
}

export function formatNetworkInviteStatus(status: NetworkInviteStatus): string {
  return (
    NETWORK_INVITE_STATUS_OPTIONS.find((option) => option.value === status)
      ?.label ?? status
  );
}

function normalizeInviteMatchText(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function inviteCompanyNamesMatch(left: string, right: string): boolean {
  const normalizedLeft = normalizeInviteMatchText(left);
  const normalizedRight = normalizeInviteMatchText(right);
  return normalizedLeft.length > 0 && normalizedLeft === normalizedRight;
}

/**
 * Partner relationship is canonical for connection state. Pending invite rows can
 * remain in the DB when a company was added directly from the directory.
 */
export function isNetworkInviteConnected(
  invite: NetworkInvite,
  partners: NetworkPartner[],
  profiles: NetworkProfile[] = [],
): boolean {
  if (invite.status === "accepted") {
    return true;
  }

  if (invite.status !== "pending") {
    return false;
  }

  const activePartners = partners.filter(
    (partner) =>
      partner.relationshipStatus === "active" && partner.linkedCompanyId,
  );
  const trustedCompanyIds = new Set(
    activePartners.map((partner) => partner.linkedCompanyId!),
  );
  const normalizedInviteEmail = normalizeInviteMatchText(invite.invitedEmail);

  if (
    invite.acceptedCompanyId &&
    trustedCompanyIds.has(invite.acceptedCompanyId)
  ) {
    return true;
  }

  for (const partner of activePartners) {
    if (partner.linkedCompanyId === invite.acceptedCompanyId) {
      return true;
    }

    const partnerEmail = normalizeInviteMatchText(partner.email);
    if (partnerEmail && partnerEmail === normalizedInviteEmail) {
      return true;
    }

    if (
      inviteCompanyNamesMatch(
        invite.invitedCompanyName,
        partner.partnerCompanyName,
      )
    ) {
      return true;
    }
  }

  for (const profile of profiles) {
    if (!trustedCompanyIds.has(profile.companyId)) {
      continue;
    }

    if (
      inviteCompanyNamesMatch(invite.invitedCompanyName, profile.displayName)
    ) {
      return true;
    }
  }

  return false;
}

export function formatNetworkInviteDisplayStatus(
  invite: NetworkInvite,
  connectedViaPartners: boolean,
): string {
  if (connectedViaPartners && invite.status === "pending") {
    return "Connected";
  }

  return formatNetworkInviteStatus(invite.status);
}

export function filterInvitesByTab(
  invites: NetworkInvite[],
  tab: NetworkInvitationsTab,
  partners: NetworkPartner[] = [],
  profiles: NetworkProfile[] = [],
): NetworkInvite[] {
  if (tab === "pending") {
    return invites.filter(
      (invite) =>
        invite.status === "pending" &&
        !isNetworkInviteConnected(invite, partners, profiles),
    );
  }

  if (tab === "accepted") {
    return invites.filter(
      (invite) =>
        invite.status === "accepted" ||
        (invite.status === "pending" &&
          isNetworkInviteConnected(invite, partners, profiles)),
    );
  }

  return invites.filter(
    (invite) => invite.status === "expired" || invite.status === "cancelled",
  );
}
