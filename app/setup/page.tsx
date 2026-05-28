import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { resolvePostLoginRedirect } from "@/lib/auth/redirects";
import { getCurrentProfile, getCurrentUser } from "@/lib/database/auth";
import { getActiveCompanyContext } from "@/lib/database/company-context";
import {
  listPendingInvitesForUserEmail,
  resolveUserEmailForInvite,
} from "@/lib/database/queries/memberships";
import { CompanySetupForm } from "@/shared/components/auth/CompanySetupForm";
import { PendingInvitesCard } from "@/shared/components/settings/PendingInvitesCard";
import { SettingsAlertBanner } from "@/shared/components/settings/SettingsAlertBanner";

type SetupPageProps = {
  searchParams: Promise<{ next?: string }>;
};

export default async function SetupPage({ searchParams }: SetupPageProps) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const context = await getActiveCompanyContext();
  const { next } = await searchParams;

  if (context) {
    redirect(resolvePostLoginRedirect(context, next));
  }

  const profile = await getCurrentProfile();
  const emailResolution = resolveUserEmailForInvite(
    profile?.email,
    user.email ?? undefined,
  );

  let pendingInvites: Awaited<
    ReturnType<typeof listPendingInvitesForUserEmail>
  >["invites"] = [];
  let pendingInvitesError: string | undefined;

  if (emailResolution.email) {
    try {
      const result = await listPendingInvitesForUserEmail(emailResolution.email);
      pendingInvites = result.invites;
      pendingInvitesError = result.error;

      if (result.error) {
        console.error("[SetupPage] pending invites unavailable:", result.error);
      }
    } catch (error) {
      console.error("[SetupPage] pending invites load failed:", error);
      pendingInvitesError =
        "We couldn't load your team invitations. Refresh the page or try again in a moment.";
    }
  }

  let aboveCard: ReactNode | undefined;

  if (emailResolution.mismatch) {
    aboveCard = (
      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        Your profile email and sign-in email do not match. Update them to the
        same address before you can view or accept team invitations. You can
        still create your own workspace below.
      </div>
    );
  } else if (pendingInvitesError || pendingInvites.length > 0) {
    aboveCard = (
      <>
        {pendingInvitesError ? (
          <SettingsAlertBanner tone="error">{pendingInvitesError}</SettingsAlertBanner>
        ) : null}
        {pendingInvites.length > 0 ? (
          <PendingInvitesCard invites={pendingInvites} variant="setup" />
        ) : null}
      </>
    );
  }

  return <CompanySetupForm aboveCard={aboveCard} />;
}
