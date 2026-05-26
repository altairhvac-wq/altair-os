import { redirect } from "next/navigation";
import { getCurrentProfile, getCurrentUser } from "@/lib/database/auth";
import { getActiveCompanyContext } from "@/lib/database/company-context";
import { listPendingInvitesForUserEmail, resolveUserEmailForInvite } from "@/lib/database/queries/memberships";
import { CompanySetupForm } from "@/shared/components/auth/CompanySetupForm";
import { PendingInvitesCard } from "@/shared/components/settings/PendingInvitesCard";

export default async function SetupPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const context = await getActiveCompanyContext();

  if (context) {
    redirect("/");
  }

  const profile = await getCurrentProfile();
  const emailResolution = resolveUserEmailForInvite(
    profile?.email,
    user.email ?? undefined,
  );

  const { invites, error: invitesError } = emailResolution.email
    ? await listPendingInvitesForUserEmail(emailResolution.email)
    : { invites: [], error: undefined };

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-6 px-4 py-8">
      {emailResolution.mismatch ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Your profile email and sign-in email do not match. Update them to the
          same address before you can view or accept team invitations.
        </div>
      ) : null}

      {invitesError ? (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {invitesError}
        </div>
      ) : null}

      <PendingInvitesCard invites={invites} variant="setup" />
      <CompanySetupForm />
    </div>
  );
}
