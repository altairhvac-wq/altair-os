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
} from "@/shared/types/notification";
import { markNotificationReadAction } from "@/app/actions/notifications";

type NotificationListItemProps = {
  notification: Notification;
  variant?: "admin" | "technician";
  onRead?: (notificationId: string) => void;
  canManageCustomers?: boolean;
  canViewBilling?: boolean;
};

export function NotificationListItem({
  notification,
  variant = "admin",
  onRead,
  canManageCustomers = true,
  canViewBilling = true,
}: NotificationListItemProps) {
  const router = useRouter();
  const unread = isNotificationUnread(notification);
  const href =
    variant === "technician"
      ? getTechnicianNotificationHref(notification)
      : getNotificationHref(notification, {
          canManageCustomers,
          canViewBilling,
        });

  async function handleClick(event?: React.MouseEvent) {
    if (!unread) {
      return;
    }

    event?.preventDefault();

    const result = await markNotificationReadAction(notification.id);

    if (result.error) {
      return;
    }

    onRead?.(notification.id);

    if (href) {
      router.push(href);
    }
  }

  const content = (
    <div
      className={`rounded-lg border px-3 py-2.5 transition-colors ${
        unread
          ? "border-cyan-200 bg-cyan-50/70"
          : "border-slate-200 bg-white"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-semibold text-slate-900">
          {formatNotificationTitleForAccess(notification, canViewBilling)}
        </p>
        {unread ? (
          <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-cyan-500" />
        ) : null}
      </div>
      <p className="mt-1 text-sm text-slate-600">
        {formatNotificationMessageForAccess(notification, canViewBilling)}
      </p>
      <p className="mt-2 text-xs text-slate-400">
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
            void handleClick(event);
            return;
          }
        }}
        className="block"
      >
        {content}
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={() => {
        void handleClick();
      }}
      className="block w-full text-left"
    >
      {content}
    </button>
  );
}
