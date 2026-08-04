"use client";

import { Bell } from "lucide-react";
import { useState } from "react";
import {
  altairMcCardClass,
  altairMcCardPadClass,
  altairMcListClass,
} from "@/shared/design-system/components/mc-surface";
import { NotificationListItem } from "@/shared/components/notifications/NotificationListItem";
import type {
  Notification,
  NotificationAccess,
} from "@/shared/types/notification";
import {
  SettingsWorkspacePage,
  SettingsWorkspaceSection,
} from "./SettingsWorkspacePage";

type SettingsNotificationsViewProps = {
  notifications: Notification[];
  unreadCount: number;
  notificationAccess?: NotificationAccess;
};

export function SettingsNotificationsView({
  notifications: initialNotifications,
  unreadCount: initialUnreadCount,
  notificationAccess,
}: SettingsNotificationsViewProps) {
  const [notifications, setNotifications] = useState(initialNotifications);
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount);

  return (
    <SettingsWorkspacePage
      title="Notifications"
      description="Preview your in-app notification inbox. Channel toggles are not available yet."
    >
      <SettingsWorkspaceSection
        title="In-app inbox"
        description="The same notifications available from the header bell. Per-type email/SMS toggles are not buildable without a preferences schema."
        card={false}
      >
        <div className={`${altairMcCardClass} overflow-hidden`}>
          <div
            className={`${altairMcCardPadClass} flex items-center justify-between gap-3 border-b border-altair-border`}
          >
            <div className="flex min-w-0 items-center gap-2.5">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-altair-brass/10 text-altair-brass">
                <Bell className="h-4 w-4" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-altair-ink">
                  Recent notifications
                </p>
                <p className="text-xs text-altair-ink-secondary">
                  {unreadCount > 0
                    ? `${unreadCount} unread`
                    : "All caught up"}
                </p>
              </div>
            </div>
            <p className="shrink-0 text-xs font-medium text-altair-ink-muted">
              Also in the header bell
            </p>
          </div>

          <div className={`${altairMcListClass} rounded-none border-0`}>
            {notifications.length === 0 ? (
              <div className="px-3.5 py-8 text-center">
                <p className="text-sm font-medium text-altair-ink">
                  No notifications yet
                </p>
                <p className="mt-1 text-sm text-altair-ink-secondary">
                  Job updates and billing activity will appear here.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-altair-border">
                {notifications.map((notification) => (
                  <li key={notification.id} className="px-2 py-1.5">
                    <NotificationListItem
                      notification={notification}
                      notificationAccess={notificationAccess}
                      onRead={(notificationId) => {
                        setNotifications((current) =>
                          current.map((item) =>
                            item.id === notificationId
                              ? { ...item, readAt: new Date().toISOString() }
                              : item,
                          ),
                        );
                        setUnreadCount((current) => Math.max(0, current - 1));
                      }}
                    />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </SettingsWorkspaceSection>
    </SettingsWorkspacePage>
  );
}
