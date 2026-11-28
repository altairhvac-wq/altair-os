import {
  Bell,
  CalendarDays,
  Clock,
  Home,
  Receipt,
  type LucideIcon,
} from "lucide-react";
import { canAccessTechnicianNavItem, type TechnicianNavId } from "@/lib/database/access-control";
import type { ActiveCompanyContext } from "@/lib/database/types";

export type TechnicianNavItem = {
  id: TechnicianNavId;
  label: string;
  href: string;
  icon: LucideIcon;
};

/**
 * The technician's destinations, in tab order.
 *
 * This list IS the technician navigation: it is rendered once, as the bottom
 * tab bar (TechnicianBottomNav). There is no menu drawer and no home-screen
 * grid repeating it (UI audit 2026-11-12: the same four places were offered
 * three ways, and Schedule, the one place a technician opens most, had no
 * tab at all).
 *
 * Keep it to five. A sixth destination belongs inside a screen, not here.
 */
export const technicianNavItems: TechnicianNavItem[] = [
  { id: "today", label: "Home", href: "/technician", icon: Home },
  { id: "schedule", label: "Schedule", href: "/technician/schedule", icon: CalendarDays },
  { id: "time", label: "Time", href: "/tech/time", icon: Clock },
  { id: "receipts", label: "Receipts", href: "/tech/receipts", icon: Receipt },
  { id: "notifications", label: "Alerts", href: "/tech/notifications", icon: Bell },
];

export function getTechnicianNavItems(
  context: ActiveCompanyContext,
): TechnicianNavItem[] {
  return technicianNavItems.filter((item) =>
    canAccessTechnicianNavItem(context, item.id),
  );
}

function matchesPath(item: TechnicianNavItem, pathname: string): boolean {
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

export function getTechnicianNavItemForPath(
  pathname: string,
  context?: ActiveCompanyContext,
): TechnicianNavItem {
  const items = context ? getTechnicianNavItems(context) : technicianNavItems;

  // Home is "/technician" and Schedule is "/technician/schedule", so the
  // longest matching address wins; otherwise Schedule would light up Home.
  const match = [...items]
    .sort((left, right) => right.href.length - left.href.length)
    .find((item) => matchesPath(item, pathname));

  return match ?? items[0] ?? technicianNavItems[0];
}
