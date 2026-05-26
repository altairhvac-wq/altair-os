"use client";

import Link from "next/link";
import { Bell } from "lucide-react";
import { useTechnicianNotificationBadge } from "./TechnicianNotificationBadgeContext";

export function TechnicianNotificationLink() {
  const { unreadCount } = useTechnicianNotificationBadge();

  return (
    <Link
      href="/tech/notifications"
      className="relative ml-auto rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
      aria-label="Notifications"
    >
      <Bell className="h-5 w-5" />
      {unreadCount > 0 ? (
        <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-cyan-600 px-1 text-[10px] font-bold text-white">
          {unreadCount > 9 ? "9+" : unreadCount}
        </span>
      ) : null}
    </Link>
  );
}
