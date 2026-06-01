import { redirect } from "next/navigation";
import { AdminShell } from "@/shared/components/admin/AdminShell";
import { getCurrentUser } from "@/lib/database/auth";
import { getActiveCompanyContext, getUserCompanies } from "@/lib/database/company-context";
import { canAccessPlatformAdmin } from "@/lib/database/platform-admin";
import {
  getUnreadNotificationCount,
  getUserNotifications,
} from "@/lib/database/services/notifications";

export default async function AdminLayout({
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

  const [notifications, unreadNotificationCount] = await Promise.all([
    getUserNotifications(companyContext.company.id, companyContext.user.id, {
      limit: 20,
    }),
    getUnreadNotificationCount(
      companyContext.company.id,
      companyContext.user.id,
    ),
  ]);

  const showPlatformAdminNav = canAccessPlatformAdmin(user);

  return (
    <AdminShell
      companyContext={companyContext}
      userCompanies={userCompanies}
      notifications={notifications}
      unreadNotificationCount={unreadNotificationCount}
      showPlatformAdminNav={showPlatformAdminNav}
    >
      {children}
    </AdminShell>
  );
}
