import { canViewBilling } from "@/lib/database/access-control";
import { getActiveCompanyContext } from "@/lib/database/company-context";
import {
  getUnreadNotificationCount,
  getUserNotifications,
} from "@/lib/database/services/notifications";
import { SettingsNotificationsView } from "@/shared/components/settings/SettingsNotificationsView";

export default async function NotificationsSettingsPage() {
  const companyContext = await getActiveCompanyContext();

  if (!companyContext) {
    return null;
  }

  const [notifications, unreadCount] = await Promise.all([
    getUserNotifications(companyContext.company.id, companyContext.user.id, {
      limit: 20,
    }),
    getUnreadNotificationCount(
      companyContext.company.id,
      companyContext.user.id,
    ),
  ]);

  return (
    <SettingsNotificationsView
      notifications={notifications}
      unreadCount={unreadCount}
      notificationAccess={{
        canViewBilling: canViewBilling(companyContext),
      }}
    />
  );
}
