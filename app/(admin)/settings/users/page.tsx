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
      />
    </div>
  );
}
