import type { IncomingNetworkInvite } from "@/shared/types/network-invite";
import {
  isActionableReceivedNetworkReferral,
  type NetworkReferral,
} from "@/shared/types/network-referral";

export type NetworkWorkspaceTab =
  | "partners"
  | "referrals"
  | "invitations"
  | "directory";

export type NetworkReferralsSubTab = "received" | "sent";

export type NetworkWorkspacePermissions = {
  canSendReferral: boolean;
  canManageNetwork: boolean;
  canManageReceivedReferrals: boolean;
};

export const NETWORK_WORKSPACE_TAB_OPTIONS: {
  value: NetworkWorkspaceTab;
  label: string;
}[] = [
  { value: "partners", label: "Partners" },
  { value: "referrals", label: "Referrals" },
  { value: "invitations", label: "Invitations" },
  { value: "directory", label: "Directory" },
];

export const NETWORK_REFERRALS_SUB_TAB_OPTIONS: {
  value: NetworkReferralsSubTab;
  label: string;
}[] = [
  { value: "received", label: "Received" },
  { value: "sent", label: "Sent" },
];

/** Office staff who only manage inbound referral work. */
export function isReferralsOnlyWorkspaceUser(
  permissions: NetworkWorkspacePermissions,
): boolean {
  return (
    permissions.canManageReceivedReferrals &&
    !permissions.canManageNetwork &&
    !permissions.canSendReferral
  );
}

export function getVisibleNetworkWorkspaceTabs(
  permissions: NetworkWorkspacePermissions,
): NetworkWorkspaceTab[] {
  if (isReferralsOnlyWorkspaceUser(permissions)) {
    return ["referrals"];
  }

  const tabs: NetworkWorkspaceTab[] = [];

  if (permissions.canManageNetwork) {
    tabs.push("partners");
  }

  if (permissions.canSendReferral || permissions.canManageReceivedReferrals) {
    tabs.push("referrals");
  }

  if (permissions.canManageNetwork) {
    tabs.push("invitations");
  }

  if (permissions.canSendReferral) {
    tabs.push("directory");
  }

  return tabs;
}

export function getDefaultNetworkWorkspaceTab(
  permissions: NetworkWorkspacePermissions,
): NetworkWorkspaceTab {
  if (isReferralsOnlyWorkspaceUser(permissions)) {
    return "referrals";
  }

  if (permissions.canManageNetwork) {
    return "partners";
  }

  if (permissions.canManageReceivedReferrals) {
    return "referrals";
  }

  if (permissions.canSendReferral) {
    return "directory";
  }

  return "partners";
}

export function getVisibleNetworkReferralsSubTabs(
  permissions: NetworkWorkspacePermissions,
): NetworkReferralsSubTab[] {
  const tabs: NetworkReferralsSubTab[] = [];

  if (permissions.canManageReceivedReferrals) {
    tabs.push("received");
  }

  if (permissions.canSendReferral) {
    tabs.push("sent");
  }

  return tabs;
}

export function getDefaultNetworkReferralsSubTab(
  permissions: NetworkWorkspacePermissions,
): NetworkReferralsSubTab {
  const visible = getVisibleNetworkReferralsSubTabs(permissions);
  return visible[0] ?? "received";
}

export function hasInvitationsAttention(
  incomingInvites: IncomingNetworkInvite[],
): boolean {
  return incomingInvites.length > 0;
}

export function hasReferralsAttention(
  receivedReferrals: NetworkReferral[],
): boolean {
  return receivedReferrals.some(isActionableReceivedNetworkReferral);
}
