"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  formatNotificationMessageForAccess,
  formatNotificationTimestamp,
  formatNotificationTitleForAccess,
  getNotificationHref,
  getTechnicianNotificationHref,
  isNotificationUnread,
  type Notification,
  type NotificationAccess,
} from "@/shared/types/notification";
import { markNotificationReadAction } from "@/app/actions/notifications";

type NotificationListItemProps = {
  notification: Notification;
  variant?: "admin" | "technician";
  onRead?: (notificationId: string) => void;
  onNavigate?: () => void;
  notificationAccess?: NotificationAccess;
};

export function NotificationListItem({
  notification,
  variant = "admin",
  onRead,
  onNavigate,
  notificationAccess,
}: NotificationListItemProps) {
  const router = useRouter();
  const unread = isNotificationUnread(notification);
  const canViewBilling = notificationAccess?.canViewBilling !== false;
  const href =
    variant === "technician"
      ? getTechnicianNotificationHref(notification)
      : getNotificationHref(notification, notificationAccess);

  async function markReadIfNeeded() {
    if (!unread) {
      return true;
    }

    const result = await markNotificationReadAction(notification.id);

    if (result.error) {
      return false;
    }

    onRead?.(notification.id);
    return true;
  }

  async function handleUnreadActivate(event: React.MouseEvent) {
    event.preventDefault();

    const marked = await markReadIfNeeded();

    if (!marked || !href) {
      return;
    }

    onNavigate?.();
    router.push(href);
  }

  const content = (
    <div
      className={`rounded-lg border px-3 py-2 transition-colors ${
        unread
          ? "border-cyan-200 bg-cyan-50/70"
          : "border-slate-200 bg-white"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="break-words text-sm font-semibold text-slate-900">
          {formatNotificationTitleForAccess(notification, canViewBilling)}
        </p>
        {unread ? (
          <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-cyan-500" />
        ) : null}
      </div>
      <p className="mt-0.5 break-words text-sm text-slate-600">
        {formatNotificationMessageForAccess(notification, canViewBilling)}
      </p>
      <p className="mt-1 text-xs text-slate-400">
        {formatNotificationTimestamp(notification.createdAt)}
      </p>
    </div>
  );

  if (href) {
    return (
      <Link
        href={href}
        onClick={(event) => {
          if (unread) {
            void handleUnreadActivate(event);
            return;
          }

          onNavigate?.();
        }}
        className="block min-h-11 min-w-0 max-w-full"
      >
        {content}
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={() => {
        void markReadIfNeeded();
      }}
      className="block w-full min-h-11 min-w-0 max-w-full text-left"
    >
      {content}
    </button>
  );
}
