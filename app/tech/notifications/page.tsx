import { redirect } from "next/navigation";
import { getActiveCompanyContext } from "@/lib/database/company-context";
import {
  getUnreadNotificationCount,
  getUserNotifications,
} from "@/lib/database/services/notifications";
import {
  filterNotificationsForTechnicianView,
  TECHNICIAN_NOTIFICATION_TYPES,
} from "@/shared/types/notification";
import { TechnicianNotificationsView } from "@/shared/components/notifications/TechnicianNotificationsView";

export default async function TechnicianNotificationsPage() {
  const context = await getActiveCompanyContext();

  if (!context) {
    redirect("/setup");
  }

  const [notifications, unreadCount] = await Promise.all([
    getUserNotifications(context.company.id, context.user.id, {
      limit: 50,
      types: TECHNICIAN_NOTIFICATION_TYPES,
    }),
    getUnreadNotificationCount(context.company.id, context.user.id, {
      types: TECHNICIAN_NOTIFICATION_TYPES,
    }),
  ]);

  return (
    <TechnicianNotificationsView
      initialNotifications={filterNotificationsForTechnicianView(notifications)}
      initialUnreadCount={unreadCount}
    />
  );
}
