import { redirect } from "next/navigation";
import { getActiveCompanyContext } from "@/lib/database/company-context";
import {
  getUnreadNotificationCount,
  getUserNotifications,
} from "@/lib/database/services/notifications";
import { TechnicianNotificationsView } from "@/shared/components/notifications/TechnicianNotificationsView";

export default async function TechnicianNotificationsPage() {
  const context = await getActiveCompanyContext();

  if (!context) {
    redirect("/setup");
  }

  const [notifications, unreadCount] = await Promise.all([
    getUserNotifications(context.company.id, context.user.id, { limit: 50 }),
    getUnreadNotificationCount(context.company.id, context.user.id),
  ]);

  return (
    <TechnicianNotificationsView
      initialNotifications={notifications}
      initialUnreadCount={unreadCount}
    />
  );
}
