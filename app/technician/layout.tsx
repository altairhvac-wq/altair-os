import { redirect } from "next/navigation";
import { TechnicianMobileShell } from "@/shared/components/technician/TechnicianMobileShell";
import { getCurrentUser } from "@/lib/database/auth";
import { getActiveCompanyContext, getUserCompanies } from "@/lib/database/company-context";
import { getUnreadNotificationCount } from "@/lib/database/services/notifications";
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

  const unreadNotificationCount = await getUnreadNotificationCount(
    companyContext.company.id,
    companyContext.user.id,
    { types: TECHNICIAN_NOTIFICATION_TYPES },
  );

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
