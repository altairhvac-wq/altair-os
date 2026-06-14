"use server";

import { revalidatePath } from "next/cache";
import { resolveAuthRedirectOrigin } from "@/lib/auth/request-origin";
import { getActiveCompanyContext } from "@/lib/database/company-context";
import { NO_ACTIVE_COMPANY_MESSAGE } from "@/lib/database/errors";
import {
  createNetworkInvite,
  listNetworkInvitesForSourceCompany,
  rotateNetworkInviteToken,
} from "@/lib/database/queries/network-invites";
import { buildNetworkInviteSignupUrl } from "@/shared/lib/network-invite-token";
import type {
  NetworkInvite,
  NetworkInviteFormData,
} from "@/shared/types/network-invite";
import {
  normalizeNetworkInviteFormData,
  validateNetworkInviteFormData,
} from "@/shared/types/network-invite";

export type NetworkInviteActionResult = {
  error?: string;
  invite?: NetworkInvite;
  invites?: NetworkInvite[];
  inviteUrl?: string;
};

async function assertNetworkInviteManager() {
  const context = await getActiveCompanyContext();

  if (!context) {
    return { error: NO_ACTIVE_COMPANY_MESSAGE } as const;
  }

  if (!context.permissions.manageCompany) {
    return {
      error: "Only company owners and admins can manage network invitations.",
    } as const;
  }

  return { context } as const;
}

function revalidateNetworkPath() {
  revalidatePath("/network");
}

export async function listNetworkInvitesAction(): Promise<NetworkInviteActionResult> {
  const permission = await assertNetworkInviteManager();
  if (permission.error || !permission.context) {
    return { invites: [], error: permission.error };
  }

  return {
    invites: await listNetworkInvitesForSourceCompany(
      permission.context.company.id,
    ),
  };
}

export async function createNetworkInviteAction(
  formData: NetworkInviteFormData,
): Promise<NetworkInviteActionResult> {
  const permission = await assertNetworkInviteManager();
  if (permission.error || !permission.context) {
    return { error: permission.error };
  }

  const normalized = normalizeNetworkInviteFormData(formData);
  const validationError = validateNetworkInviteFormData(normalized);

  if (validationError) {
    return { error: validationError };
  }

  const result = await createNetworkInvite({
    sourceCompanyId: permission.context.company.id,
    sourceUserId: permission.context.user.id,
    invitedCompanyName: normalized.invitedCompanyName,
    invitedContactName: normalized.invitedContactName,
    invitedEmail: normalized.invitedEmail,
    invitedPhone: normalized.invitedPhone,
    tradeCategory: normalized.tradeCategory,
    personalMessage: normalized.personalMessage || undefined,
  });

  if (result.error || !result.invite || !result.rawToken) {
    return { error: result.error ?? "We couldn't create this invitation." };
  }

  const { origin } = await resolveAuthRedirectOrigin();
  const inviteUrl = origin
    ? buildNetworkInviteSignupUrl(origin, result.rawToken)
    : undefined;

  revalidateNetworkPath();

  return {
    invite: {
      ...result.invite,
      inviteUrl,
    },
    inviteUrl,
  };
}

export async function copyNetworkInviteLinkAction(
  inviteId: string,
): Promise<NetworkInviteActionResult> {
  const permission = await assertNetworkInviteManager();
  if (permission.error || !permission.context) {
    return { error: permission.error };
  }

  const invites = await listNetworkInvitesForSourceCompany(
    permission.context.company.id,
  );
  const invite = invites.find((item) => item.id === inviteId);

  if (!invite) {
    return { error: "Invitation not found." };
  }

  if (invite.status !== "pending") {
    return { error: "Only pending invitations have an active invite link." };
  }

  const rotation = await rotateNetworkInviteToken({
    inviteId,
    sourceCompanyId: permission.context.company.id,
  });

  if (rotation.error || !rotation.rawToken) {
    return { error: rotation.error ?? "Unable to generate invite link." };
  }

  const { origin } = await resolveAuthRedirectOrigin();
  if (!origin) {
    return { error: "Unable to build invite link for this environment." };
  }

  return {
    inviteUrl: buildNetworkInviteSignupUrl(origin, rotation.rawToken),
  };
}
