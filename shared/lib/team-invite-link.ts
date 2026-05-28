export const TEAM_INVITE_ACCEPT_PATH = "/setup";

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
