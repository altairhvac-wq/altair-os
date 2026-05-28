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
};

export function NotificationBell({
  initialNotifications,
  initialUnreadCount,
  notificationAccess,
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
        className="relative rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
        aria-label="Notifications"
        aria-expanded={open}
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 ? (
          <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-cyan-600 px-1 text-[10px] font-bold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 z-50 mt-2 w-[min(20rem,calc(100vw-2rem))] max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg sm:w-80">
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
            <p className="text-sm font-semibold text-slate-900">Notifications</p>
            {unreadCount > 0 ? (
              <button
                type="button"
                onClick={handleMarkAllRead}
                disabled={isPending}
                className="text-xs font-semibold text-cyan-700 transition-colors hover:text-cyan-800 disabled:opacity-50"
              >
                Mark all read
              </button>
            ) : null}
          </div>

          <div className="max-h-[min(24rem,calc(100dvh-6rem-env(safe-area-inset-top,0px)))] space-y-2 overflow-y-auto overscroll-contain p-3 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))]">
            {actionError ? (
              <p className="break-words px-2 text-sm text-red-600" role="alert">
                {actionError}
              </p>
            ) : null}
            {notifications.length === 0 ? (
              <div className="px-2 py-6 text-center">
                <p className="text-sm font-medium text-slate-700">
                  No notifications yet
                </p>
                <p className="mt-1 text-sm text-slate-500">
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
