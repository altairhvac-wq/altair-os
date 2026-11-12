import "../app.css";
import { redirect } from "next/navigation";
import { TechnicianMobileShell } from "@/shared/components/technician/TechnicianMobileShell";
import { getCurrentUser } from "@/lib/database/auth";
import { getActiveCompanyContext, getUserCompanies } from "@/lib/database/company-context";
import { getUnreadNotificationCount } from "@/lib/database/services/notifications";
import { requireCompanyBillingAppAccess } from "@/lib/saas-billing/require-app-access";
import { TECHNICIAN_NOTIFICATION_TYPES } from "@/shared/types/notification";

export default async function TechLayout({
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

  // Started together: the billing gate still redirects before anything
  // renders (a redirect rejects the whole Promise.all), and the count is a
  // read with no side effects, so it no longer waits for the gate.
  const [, unreadNotificationCount] = await Promise.all([
    requireCompanyBillingAppAccess(companyContext.company.id),
    getUnreadNotificationCount(
      companyContext.company.id,
      companyContext.user.id,
      { types: TECHNICIAN_NOTIFICATION_TYPES },
    ),
  ]);

  return (
    <TechnicianMobileShell
      companyContext={companyContext}
      userCompanies={userCompanies}
      unreadNotificationCount={unreadNotificationCount}
    >
      {children}
    </TechnicianMobileShell>
  );
}
