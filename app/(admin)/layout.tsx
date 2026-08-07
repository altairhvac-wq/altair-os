import { redirect } from "next/navigation";
import { AdminShell } from "@/shared/components/admin/AdminShell";
import { shouldUseTechnicianHome } from "@/lib/auth/redirects";
import { getCurrentUser } from "@/lib/database/auth";
import { getActiveCompanyContext, getUserCompanies } from "@/lib/database/company-context";
import { shouldHideDemoPrefixesForDisplay } from "@/lib/database/founder-marketing-display";
import { canAccessPlatformAdmin } from "@/lib/database/platform-admin";
import { getLiveDesignLabTheme } from "@/lib/database/queries/design-lab-themes";
import {
  getUnreadNotificationCount,
  getUserNotifications,
} from "@/lib/database/services/notifications";
import { requireCompanyBillingAppAccess } from "@/lib/saas-billing/require-app-access";
import { buildDesignLabLiveStyleVars } from "@/shared/components/platform-admin/design-lab/design-lab-live-vars";

export default async function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const companyContext = await getActiveCompanyContext();

  if (!companyContext) {
    redirect("/setup");
  }

  const userCompanies = await getUserCompanies();

  if (shouldUseTechnicianHome(companyContext)) {
    redirect("/technician");
  }

  const billingAccess = await requireCompanyBillingAppAccess(
    companyContext.company.id,
  );

  const [notifications, unreadNotificationCount, liveTheme] =
    await Promise.all([
      getUserNotifications(companyContext.company.id, companyContext.user.id, {
        limit: 20,
      }),
      getUnreadNotificationCount(
        companyContext.company.id,
        companyContext.user.id,
      ),
      getLiveDesignLabTheme(companyContext.company.id),
    ]);

  const showPlatformAdminNav = canAccessPlatformAdmin(user);
  const hideDemoPrefixes = shouldHideDemoPrefixesForDisplay(user);
  // Fail closed: invalid/empty token maps yield null → default product chrome.
  const liveThemeStyle = liveTheme
    ? buildDesignLabLiveStyleVars(liveTheme.tokens)
    : null;

  return (
    <AdminShell
      companyContext={companyContext}
      userCompanies={userCompanies}
      notifications={notifications}
      unreadNotificationCount={unreadNotificationCount}
      showPlatformAdminNav={showPlatformAdminNav}
      hideDemoPrefixes={hideDemoPrefixes}
      billingAccess={billingAccess}
      liveThemeStyle={liveThemeStyle}
    >
      {children}
    </AdminShell>
  );
}
