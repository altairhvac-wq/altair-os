import { redirect } from "next/navigation";
import { TechnicianMobileShell } from "@/shared/components/technician/TechnicianMobileShell";
import { getCurrentUser } from "@/lib/database/auth";
import { getActiveCompanyContext, getUserCompanies } from "@/lib/database/company-context";
import { shouldHideDemoPrefixesForDisplay } from "@/lib/database/founder-marketing-display";
import { getUnreadNotificationCount } from "@/lib/database/services/notifications";
import { getRequestCompanyBillingAccess } from "@/lib/saas-billing/request-access";
import { TECHNICIAN_NOTIFICATION_TYPES } from "@/shared/types/notification";

export default async function TechnicianLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const [companyContext, userCompanies] = await Promise.all([
    getActiveCompanyContext(),
    getUserCompanies(),
  ]);

  if (!companyContext) {
    redirect("/setup");
  }

  const [unreadNotificationCount, billingAccess] = await Promise.all([
    getUnreadNotificationCount(
      companyContext.company.id,
      companyContext.user.id,
      { types: TECHNICIAN_NOTIFICATION_TYPES },
    ),
    getRequestCompanyBillingAccess(companyContext.company.id),
  ]);

  const hideDemoPrefixes = shouldHideDemoPrefixesForDisplay(user);
  const canManageBilling = companyContext.permissions.manageCompany;

  return (
    <TechnicianMobileShell
      companyContext={companyContext}
      userCompanies={userCompanies}
      unreadNotificationCount={unreadNotificationCount}
      hideDemoPrefixes={hideDemoPrefixes}
      billingAccess={billingAccess}
      canManageBilling={canManageBilling}
    >
      {children}
    </TechnicianMobileShell>
  );
}
