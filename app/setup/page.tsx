import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { getCurrentProfile, getCurrentUser } from "@/lib/database/auth";
import { getActiveCompanyContext } from "@/lib/database/company-context";
import {
  listPendingInvitesForUserEmail,
  resolveUserEmailForInvite,
} from "@/lib/database/queries/memberships";
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

  let pendingInvites: Awaited<
    ReturnType<typeof listPendingInvitesForUserEmail>
  >["invites"] = [];

  if (emailResolution.email) {
    try {
      const result = await listPendingInvitesForUserEmail(emailResolution.email);
      pendingInvites = result.invites;

      if (result.error) {
        console.error("[SetupPage] pending invites unavailable:", result.error);
      }
    } catch (error) {
      console.error("[SetupPage] pending invites load failed:", error);
    }
  }

  let aboveCard: ReactNode;

  if (emailResolution.mismatch) {
    aboveCard = (
      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        Your profile email and sign-in email do not match. Update them to the
        same address before you can view or accept team invitations.
      </div>
    );
  } else if (pendingInvites.length > 0) {
    aboveCard = (
      <PendingInvitesCard invites={pendingInvites} variant="setup" />
    );
  }

  return <CompanySetupForm aboveCard={aboveCard} />;
}
