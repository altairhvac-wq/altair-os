"use client";

import type { NotificationAccess } from "@/shared/types/notification";
import type { Notification } from "@/shared/types/notification";
import { NotificationListItem } from "@/shared/components/notifications/NotificationListItem";

type DashboardNotificationsListProps = {
  notifications: Notification[];
  notificationAccess: NotificationAccess;
};

export function DashboardNotificationsList({
  notifications,
  notificationAccess,
}: DashboardNotificationsListProps) {
  return (
    <ul className="divide-y divide-slate-100 rounded-xl border border-slate-100">
      {notifications.map((notification) => (
        <li key={notification.id}>
          <NotificationListItem
            notification={notification}
            notificationAccess={notificationAccess}
          />
        </li>
      ))}
    </ul>
  );
}
