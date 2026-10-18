export const TEAM_INVITE_ACCEPT_PATH = "/setup";

/**
 * How long a pending team invite can be claimed (launch audit H4). Written to
 * company_memberships.invite_expires_at when the invite is created and checked
 * both by the RLS claim policies (migration 199) and by acceptPendingInvite.
 */
export const TEAM_INVITE_EXPIRY_DAYS = 14;

export function computeTeamInviteExpiresAt(invitedAt: Date = new Date()): string {
  const expires = new Date(invitedAt.getTime());
  expires.setUTCDate(expires.getUTCDate() + TEAM_INVITE_EXPIRY_DAYS);
  return expires.toISOString();
}

export function isTeamInviteExpired(
  inviteExpiresAt: string | null | undefined,
  nowMs: number = Date.now(),
): boolean {
  if (!inviteExpiresAt) {
    // Legacy invite created before the column existed: migration 199
    // backfills these, but a null must not read as "never expires" forever.
    return false;
  }
  const ms = Date.parse(inviteExpiresAt);
  return !Number.isNaN(ms) && ms <= nowMs;
}

export function buildTeamInviteAcceptUrl(appBaseUrl: string): string {
  const base = appBaseUrl.replace(/\/$/, "");
  return `${base}${TEAM_INVITE_ACCEPT_PATH}`;
}

export function buildTeamInviteShareText(input: {
  acceptUrl: string;
  inviteEmail: string;
  companyName?: string;
}): string {
  const companySuffix = input.companyName?.trim()
    ? ` ${input.companyName.trim()}`
    : "";

  return `You've been invited to join${companySuffix} on Altair OS. Sign up or log in at ${input.acceptUrl} using ${input.inviteEmail} to accept your team invitation.`;
}

export function buildTeamInviteShareTextFromOrigin(
  origin: string,
  inviteEmail: string,
  companyName?: string,
): string {
  return buildTeamInviteShareText({
    acceptUrl: buildTeamInviteAcceptUrl(origin),
    inviteEmail,
    companyName,
  });
}
