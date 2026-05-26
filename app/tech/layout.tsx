import { redirect } from "next/navigation";
import { TechnicianMobileShell } from "@/shared/components/technician/TechnicianMobileShell";
import { getCurrentUser } from "@/lib/database/auth";
import { getActiveCompanyContext, getUserCompanies } from "@/lib/database/company-context";
import { getUnreadNotificationCount } from "@/lib/database/services/notifications";

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

  const unreadNotificationCount = await getUnreadNotificationCount(
    companyContext.company.id,
    companyContext.user.id,
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
