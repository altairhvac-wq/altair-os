import { getPublicNetworkInvitePreview } from "@/lib/database/queries/network-invites";

export async function validateSignupNetworkInviteEmail(
  rawToken: string,
  signupEmail: string,
): Promise<string | null> {
  const preview = await getPublicNetworkInvitePreview(rawToken);

  if (preview.state !== "valid") {
    if (preview.state === "expired") {
      return "This invitation has expired. Ask your partner to send a new invite.";
    }

    if (preview.state === "accepted") {
      return "This invitation has already been used.";
    }

    return "This invitation link is invalid.";
  }

  const invitedEmail = preview.invitedEmail?.trim().toLowerCase();
  const normalizedSignupEmail = signupEmail.trim().toLowerCase();

  if (!invitedEmail || invitedEmail !== normalizedSignupEmail) {
    return "Sign up with the same email address that received the invitation.";
  }

  return null;
}
