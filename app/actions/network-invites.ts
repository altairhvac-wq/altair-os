"use server";

import { revalidatePath } from "next/cache";
import { resolveAuthRedirectOrigin } from "@/lib/auth/request-origin";
import { getActiveCompanyContext } from "@/lib/database/company-context";
import { NO_ACTIVE_COMPANY_MESSAGE } from "@/lib/database/errors";
import {
  acceptIncomingNetworkInvite,
  createNetworkInvite,
  getStoredNetworkInviteRawToken,
  listIncomingNetworkInvitesForUser,
  listNetworkInvitesForSourceCompany,
  rotateNetworkInviteToken,
} from "@/lib/database/queries/network-invites";
import { sendNetworkInviteEmail } from "@/lib/email/network-invite";
import { buildNetworkInviteSignupUrl } from "@/shared/lib/network-invite-token";
import type {
  IncomingNetworkInvite,
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
  incomingInvites?: IncomingNetworkInvite[];
  inviteUrl?: string;
  sourceCompanyName?: string;
  alreadyAccepted?: boolean;
  /** True when the returned inviteUrl invalidated previously shared links. */
  rotated?: boolean;
  /** Whether the invitation email reached the provider. */
  emailDelivery?: "sent" | "failed";
  /** Non-fatal notice (e.g. invite saved but email could not be sent). */
  warning?: string;
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
  // /community is the live route; /network is only a redirect stub.
  revalidatePath("/community");
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

  // Deliver the invitation by email (best-effort — the invite is already
  // saved, and the same stable link stays copyable from the invitation card).
  let emailDelivery: "sent" | "failed" | undefined;
  let warning: string | undefined;

  if (inviteUrl) {
    const emailResult = await sendNetworkInviteEmail({
      to: result.invite.invitedEmail,
      invitedContactName: result.invite.invitedContactName,
      invitedCompanyName: result.invite.invitedCompanyName,
      sourceCompanyName: permission.context.company.name,
      inviterName: permission.context.profile.full_name,
      personalMessage: result.invite.personalMessage,
      inviteUrl,
    });

    emailDelivery = emailResult.ok ? "sent" : "failed";
    if (!emailResult.ok) {
      warning =
        "The invitation was saved, but the email couldn't be sent. Copy the invite link and share it directly.";
    }
  } else {
    emailDelivery = "failed";
    warning =
      "The invitation was saved, but the invite link couldn't be built in this environment, so no email was sent.";
  }

  revalidateNetworkPath();

  return {
    invite: {
      ...result.invite,
      inviteUrl,
    },
    inviteUrl,
    emailDelivery,
    warning,
  };
}

export async function listIncomingNetworkInvitesAction(): Promise<NetworkInviteActionResult> {
  const context = await getActiveCompanyContext();

  if (!context) {
    return { incomingInvites: [], error: NO_ACTIVE_COMPANY_MESSAGE };
  }

  return {
    incomingInvites: await listIncomingNetworkInvitesForUser(
      context.company.id,
    ),
  };
}

export async function acceptIncomingNetworkInviteAction(
  inviteId: string,
): Promise<NetworkInviteActionResult> {
  const permission = await assertNetworkInviteManager();
  if (permission.error || !permission.context) {
    return { error: permission.error };
  }

  if (!inviteId.trim()) {
    return { error: "Invitation not found." };
  }

  const result = await acceptIncomingNetworkInvite({
    inviteId: inviteId.trim(),
    acceptedCompanyId: permission.context.company.id,
  });

  if (!result.ok) {
    return { error: result.error ?? "Unable to accept this invitation." };
  }

  revalidateNetworkPath();

  return {
    sourceCompanyName: result.sourceCompanyName,
    alreadyAccepted: result.alreadyAccepted,
  };
}

async function resolvePendingInvite(inviteId: string, sourceCompanyId: string) {
  const invites = await listNetworkInvitesForSourceCompany(sourceCompanyId);
  const invite = invites.find((item) => item.id === inviteId);

  if (!invite) {
    return { error: "Invitation not found." } as const;
  }

  if (invite.status !== "pending") {
    return {
      error: "Only pending invitations have an active invite link.",
    } as const;
  }

  return { invite } as const;
}

/**
 * Copy the invite link. Returns the SAME link every time via the encrypted
 * stored token; only falls back to rotating (which invalidates previously
 * shared links, flagged via `rotated`) for legacy invites created before
 * encrypted token storage existed.
 */
export async function copyNetworkInviteLinkAction(
  inviteId: string,
): Promise<NetworkInviteActionResult> {
  const permission = await assertNetworkInviteManager();
  if (permission.error || !permission.context) {
    return { error: permission.error };
  }

  const resolved = await resolvePendingInvite(
    inviteId,
    permission.context.company.id,
  );
  if (resolved.error || !resolved.invite) {
    return { error: resolved.error };
  }

  const { origin } = await resolveAuthRedirectOrigin();
  if (!origin) {
    return { error: "Unable to build invite link for this environment." };
  }

  const storedToken = await getStoredNetworkInviteRawToken({
    inviteId,
    sourceCompanyId: permission.context.company.id,
  });

  if (storedToken) {
    return {
      inviteUrl: buildNetworkInviteSignupUrl(origin, storedToken),
      rotated: false,
    };
  }

  // Legacy invite (no recoverable stored token) — rotation is the only option.
  const rotation = await rotateNetworkInviteToken({
    inviteId,
    sourceCompanyId: permission.context.company.id,
  });

  if (rotation.error || !rotation.rawToken) {
    return { error: rotation.error ?? "Unable to generate invite link." };
  }

  return {
    inviteUrl: buildNetworkInviteSignupUrl(origin, rotation.rawToken),
    rotated: true,
  };
}

/**
 * Explicitly issue a fresh invite link, invalidating every previously shared
 * link for this invitation. This is the deliberate revoke-and-reissue path —
 * plain copying never rotates anymore.
 */
/**
 * Re-send the invitation email for a pending invite, reusing the same stable
 * link. Falls back to rotating (flagged via `rotated`) only for legacy invites
 * without a recoverable stored token.
 */
export async function resendNetworkInviteEmailAction(
  inviteId: string,
): Promise<NetworkInviteActionResult> {
  const permission = await assertNetworkInviteManager();
  if (permission.error || !permission.context) {
    return { error: permission.error };
  }

  const resolved = await resolvePendingInvite(
    inviteId,
    permission.context.company.id,
  );
  if (resolved.error || !resolved.invite) {
    return { error: resolved.error };
  }

  const { origin } = await resolveAuthRedirectOrigin();
  if (!origin) {
    return { error: "Unable to build invite link for this environment." };
  }

  let rotated = false;
  let rawToken = await getStoredNetworkInviteRawToken({
    inviteId,
    sourceCompanyId: permission.context.company.id,
  });

  if (!rawToken) {
    const rotation = await rotateNetworkInviteToken({
      inviteId,
      sourceCompanyId: permission.context.company.id,
    });

    if (rotation.error || !rotation.rawToken) {
      return { error: rotation.error ?? "Unable to build the invite link." };
    }

    rawToken = rotation.rawToken;
    rotated = true;
  }

  const inviteUrl = buildNetworkInviteSignupUrl(origin, rawToken);

  const emailResult = await sendNetworkInviteEmail({
    to: resolved.invite.invitedEmail,
    invitedContactName: resolved.invite.invitedContactName,
    invitedCompanyName: resolved.invite.invitedCompanyName,
    sourceCompanyName: permission.context.company.name,
    inviterName: permission.context.profile.full_name,
    personalMessage: resolved.invite.personalMessage,
    inviteUrl,
  });

  if (!emailResult.ok) {
    return {
      inviteUrl,
      rotated,
      emailDelivery: "failed",
      error: emailResult.message,
    };
  }

  return { inviteUrl, rotated, emailDelivery: "sent" };
}

export async function regenerateNetworkInviteLinkAction(
  inviteId: string,
): Promise<NetworkInviteActionResult> {
  const permission = await assertNetworkInviteManager();
  if (permission.error || !permission.context) {
    return { error: permission.error };
  }

  const resolved = await resolvePendingInvite(
    inviteId,
    permission.context.company.id,
  );
  if (resolved.error || !resolved.invite) {
    return { error: resolved.error };
  }

  const rotation = await rotateNetworkInviteToken({
    inviteId,
    sourceCompanyId: permission.context.company.id,
  });

  if (rotation.error || !rotation.rawToken) {
    return { error: rotation.error ?? "Unable to generate a new invite link." };
  }

  const { origin } = await resolveAuthRedirectOrigin();
  if (!origin) {
    return { error: "Unable to build invite link for this environment." };
  }

  return {
    inviteUrl: buildNetworkInviteSignupUrl(origin, rotation.rawToken),
    rotated: true,
  };
}
