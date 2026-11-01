import type { Metadata } from "next";
import { canManageTeamMembers } from "@/lib/database/access-control";
import { getCurrentProfile, getCurrentUser } from "@/lib/database/auth";
import { getActiveCompanyContext } from "@/lib/database/company-context";
import {
  listCompanyMembers,
  listPendingInvitesForUserEmail,
  resolveUserEmailForInvite,
  type PendingTeamInvite,
} from "@/lib/database/queries/memberships";
import { SettingsAlertBanner } from "@/shared/components/settings/SettingsAlertBanner";
import { TeamSettingsView } from "@/shared/components/settings/TeamSettingsView";
import { resolveCompanyAccountAllowance } from "@/lib/saas-billing/accounts";

/**
 * One sentence for the invite form when the next seat will be billed. Null
 * while seats are included, on the trial, or when extra seats cannot be
 * sold (then the action itself refuses with its own message).
 */
async function resolveInviteSeatNotice(companyId: string): Promise<string | null> {
  try {
    const allowance = await resolveCompanyAccountAllowance(companyId);
    if (!allowance.onPaidPlan) return null;
    if (allowance.usedAccounts < allowance.includedAccounts) return null;
    if (allowance.additionalAccountPriceUsd === null || !allowance.additionalAccountsSellable) {
      return null;
    }
    return `Your plan includes ${allowance.includedAccounts} accounts and all are in use. This seat adds $${allowance.additionalAccountPriceUsd}/month to your subscription.`;
  } catch {
    return null;
  }
}

async function loadPendingInvitesSafely(
  email: string | null | undefined,
): Promise<{ invites: PendingTeamInvite[]; error?: string }> {
  if (!email) {
    return { invites: [] };
  }

  try {
    return await listPendingInvitesForUserEmail(email);
  } catch (error) {
    console.error("[UsersSettingsPage] pending invites load failed:", error);
    return {
      invites: [],
      error: "Failed to load pending invitations. Please refresh and try again.",
    };
  }
}

export const metadata: Metadata = {
  title: "Users",
};

export default async function UsersSettingsPage() {
  const [user, profile, companyContext] = await Promise.all([
    getCurrentUser(),
    getCurrentProfile(),
    getActiveCompanyContext(),
  ]);

  if (!companyContext) {
    return null;
  }

  const emailResolution = resolveUserEmailForInvite(
    profile?.email,
    user?.email ?? undefined,
  );
  const [{ members, error: membersError }, pendingInvitesResult] =
    await Promise.all([
      listCompanyMembers(companyContext.company.id, companyContext),
      loadPendingInvitesSafely(emailResolution.email),
    ]);
  const pendingInvites = pendingInvitesResult.invites.filter(
    (invite) => invite.companyId !== companyContext.company.id,
  );

  return (
    <div className="space-y-4">
      {emailResolution.mismatch ? (
        <SettingsAlertBanner tone="warning">
          Your profile email and sign-in email do not match. Update them to the
          same address before you can view or accept team invitations.
        </SettingsAlertBanner>
      ) : null}
      {pendingInvitesResult.error ? (
        <SettingsAlertBanner tone="error">
          {pendingInvitesResult.error}
        </SettingsAlertBanner>
      ) : null}

      <TeamSettingsView
        initialMembers={members}
        currentUserId={companyContext.user.id}
        currentUserRole={companyContext.role}
        canManageTeam={canManageTeamMembers(companyContext)}
        pendingInvites={pendingInvites}
        membersLoadError={membersError}
        inviteSeatNotice={
          canManageTeamMembers(companyContext)
            ? await resolveInviteSeatNotice(companyContext.company.id)
            : null
        }
      />
    </div>
  );
}
