"use client";

import Link from "next/link";
import { Bell } from "lucide-react";
import { useTechnicianNotificationBadge } from "./TechnicianNotificationBadgeContext";

/**
 * Header bell for the technician shell. A full 44×44 target (it measured
 * 36×36 in the 2026-10-24 phone audit, flush against its neighbours).
 */
export function TechnicianNotificationLink() {
  const { unreadCount } = useTechnicianNotificationBadge();
  const label =
    unreadCount > 0
      ? `Alerts, ${unreadCount} unread`
      : "Alerts";

  return (
    <Link
      href="/tech/notifications"
      className="relative inline-flex h-11 w-11 shrink-0 touch-manipulation items-center justify-center rounded-xl text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 active:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-600"
      aria-label={label}
    >
      <Bell className="h-[22px] w-[22px]" aria-hidden />
      {unreadCount > 0 ? (
        <span className="absolute right-1 top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-cyan-700 px-1 text-[10px] font-bold text-white ring-2 ring-white">
          {unreadCount > 9 ? "9+" : unreadCount}
        </span>
      ) : null}
    </Link>
  );
}
