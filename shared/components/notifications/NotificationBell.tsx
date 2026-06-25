"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Bell } from "lucide-react";
import {
  markAllNotificationsReadAction,
} from "@/app/actions/notifications";
import type {
  Notification,
  NotificationAccess,
} from "@/shared/types/notification";
import { NotificationListItem } from "./NotificationListItem";

type NotificationBellProps = {
  initialNotifications: Notification[];
  initialUnreadCount: number;
  notificationAccess?: NotificationAccess;
  tone?: "light" | "dark";
  triggerClassName?: string;
  badgeClassName?: string;
};

export function NotificationBell({
  initialNotifications,
  initialUnreadCount,
  notificationAccess,
  tone = "light",
  triggerClassName,
  badgeClassName,
}: NotificationBellProps) {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState(initialNotifications);
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setNotifications(initialNotifications);
    setUnreadCount(initialUnreadCount);
  }, [initialNotifications, initialUnreadCount]);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!panelRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    if (open) {
      document.addEventListener("mousedown", handlePointerDown);
    }

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, [open]);

  function handleNotificationRead(notificationId: string) {
    setNotifications((current) =>
      current.map((notification) =>
        notification.id === notificationId
          ? { ...notification, readAt: new Date().toISOString() }
          : notification,
      ),
    );
    setUnreadCount((current) => Math.max(0, current - 1));
  }

  function handleMarkAllRead() {
    if (isPending) {
      return;
    }

    setActionError(null);

    startTransition(async () => {
      const result = await markAllNotificationsReadAction();

      if (result.error) {
        setActionError(
          result.error ??
            "Could not mark notifications as read. Please try again.",
        );
        return;
      }

      setNotifications(result.notifications ?? []);
      setUnreadCount(result.unreadCount ?? 0);
    });
  }

  return (
    <div ref={panelRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className={`relative rounded-lg p-2 transition-colors ${
          triggerClassName ??
          (tone === "dark"
            ? "text-slate-400 hover:bg-white/10 hover:text-slate-200"
            : "text-slate-400 hover:bg-slate-100 hover:text-slate-600")
        }`}
        aria-label="Notifications"
        aria-expanded={open}
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 ? (
          <span
            className={`absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold text-white ${
              badgeClassName ?? "bg-cyan-600"
            }`}
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="fixed left-1/2 top-[calc(3.75rem+env(safe-area-inset-top,0px))] z-50 w-[calc(100vw-1rem)] max-w-none -translate-x-1/2 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg sm:absolute sm:left-auto sm:right-0 sm:top-auto sm:mt-2 sm:w-96 sm:max-w-md sm:translate-x-0 north-star-notification-panel">
          <div className="flex min-w-0 items-center justify-between gap-2 border-b border-slate-200 px-3 py-2.5">
            <p className="north-star-notification-title min-w-0 truncate text-sm font-semibold text-slate-900">
              Notifications
            </p>
            {unreadCount > 0 ? (
              <button
                type="button"
                onClick={handleMarkAllRead}
                disabled={isPending}
                className="shrink-0 text-xs font-semibold text-cyan-700 transition-colors hover:text-cyan-800 disabled:opacity-50"
              >
                Mark all read
              </button>
            ) : null}
          </div>

          <div className="max-h-[min(70vh,32rem)] min-w-0 space-y-1.5 overflow-x-hidden overflow-y-auto overscroll-contain p-2.5">
            {actionError ? (
              <p className="break-words px-2 text-sm text-red-600" role="alert">
                {actionError}
              </p>
            ) : null}
            {notifications.length === 0 ? (
              <div className="px-2 py-4 text-center">
                <p className="north-star-notification-empty text-sm font-medium text-slate-700">
                  No notifications yet
                </p>
                <p className="north-star-notification-helper mt-1 text-sm text-slate-500">
                  Job updates and billing activity will appear here.
                </p>
              </div>
            ) : (
              notifications.map((notification) => (
                <NotificationListItem
                  key={notification.id}
                  notification={notification}
                  onRead={handleNotificationRead}
                  notificationAccess={notificationAccess}
                  onNavigate={() => setOpen(false)}
                />
              ))
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
