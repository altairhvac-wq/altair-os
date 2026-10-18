/**
 * Where an invite email sends people.
 *
 * `/setup` alone assumed an account already existed: a new hire landed on
 * the login redirect, went to /signup on their own, and was made to invent a
 * company name and a trade before being told they had an invite (launch
 * audit M4). `/signup?next=/setup` tells the form it is a join, and the
 * login redirect for anyone who already has an account still ends at /setup.
 */
export const TEAM_INVITE_ACCEPT_PATH = "/signup?next=/setup";

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
