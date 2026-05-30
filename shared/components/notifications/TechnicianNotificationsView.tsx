"use client";

import { useEffect, useState, useTransition } from "react";
import { Bell } from "lucide-react";
import { markAllNotificationsReadAction } from "@/app/actions/notifications";
import type { Notification } from "@/shared/types/notification";
import { TECHNICIAN_NOTIFICATION_TYPES } from "@/shared/types/notification";
import { useTechnicianNotificationBadge } from "./TechnicianNotificationBadgeContext";
import { NotificationListItem } from "./NotificationListItem";

type TechnicianNotificationsViewProps = {
  initialNotifications: Notification[];
  initialUnreadCount: number;
};

export function TechnicianNotificationsView({
  initialNotifications,
  initialUnreadCount,
}: TechnicianNotificationsViewProps) {
  const { setUnreadCount, decrementUnread, clearUnread } =
    useTechnicianNotificationBadge();
  const [notifications, setNotifications] = useState(initialNotifications);
  const [unreadCount, setLocalUnreadCount] = useState(initialUnreadCount);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setNotifications(initialNotifications);
    setLocalUnreadCount(initialUnreadCount);
    setUnreadCount(initialUnreadCount);
  }, [initialNotifications, initialUnreadCount, setUnreadCount]);

  function handleNotificationRead(notificationId: string) {
    const readAt = new Date().toISOString();

    setNotifications((current) =>
      current.map((notification) =>
        notification.id === notificationId
          ? { ...notification, readAt }
          : notification,
      ),
    );
    setLocalUnreadCount((current) => Math.max(0, current - 1));
    decrementUnread();
  }

  function handleMarkAllRead() {
    if (isPending) {
      return;
    }

    setActionError(null);

    startTransition(async () => {
      const result = await markAllNotificationsReadAction({
        types: TECHNICIAN_NOTIFICATION_TYPES,
      });

      if (result.error) {
        setActionError(
          result.error ??
            "Could not mark notifications as read. Please try again.",
        );
        return;
      }

      const readAt = new Date().toISOString();

      setNotifications((current) =>
        current.map((notification) =>
          notification.readAt ? notification : { ...notification, readAt },
        ),
      );
      setLocalUnreadCount(0);
      clearUnread();
    });
  }

  return (
    <div className="space-y-3 pb-[max(0.5rem,env(safe-area-inset-bottom,0px))]">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-slate-900">Notifications</h1>
          <p className="text-sm text-slate-500">
            {unreadCount > 0
              ? `${unreadCount} unread`
              : "You're all caught up"}
          </p>
        </div>
        {unreadCount > 0 ? (
          <button
            type="button"
            onClick={handleMarkAllRead}
            disabled={isPending}
            className="rounded-lg bg-white px-3 py-2 text-xs font-semibold text-cyan-700 shadow-sm ring-1 ring-slate-200 transition-colors hover:bg-slate-50 disabled:opacity-50"
          >
            Mark all read
          </button>
        ) : null}
      </div>

      {actionError ? (
        <p className="break-words text-sm text-red-600" role="alert">
          {actionError}
        </p>
      ) : null}

      {notifications.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-7 text-center">
          <Bell className="mx-auto h-7 w-7 text-slate-300" />
          <p className="mt-2 text-sm font-medium text-slate-700">
            No notifications yet
          </p>
          <p className="mt-1 text-sm text-slate-500">
            Job assignments and expense updates will show up here.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((notification) => (
            <NotificationListItem
              key={notification.id}
              notification={notification}
              variant="technician"
              onRead={handleNotificationRead}
            />
          ))}
        </div>
      )}
    </div>
  );
}
