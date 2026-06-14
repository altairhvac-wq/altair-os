/**
 * Types for Trusted Network Invitations V1 (`network_invites`).
 *
 * Invitations let companies invite contractors to join Altair; accepted signups
 * auto-create trusted partner links in `network_partners`.
 */

import type { NetworkInviteStatus } from "@/lib/database/types/enums";
import type { TradeType } from "@/shared/types/network";

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

export function filterInvitesByTab(
  invites: NetworkInvite[],
  tab: NetworkInvitationsTab,
): NetworkInvite[] {
  if (tab === "pending") {
    return invites.filter((invite) => invite.status === "pending");
  }

  if (tab === "accepted") {
    return invites.filter((invite) => invite.status === "accepted");
  }

  return invites.filter(
    (invite) => invite.status === "expired" || invite.status === "cancelled",
  );
}
