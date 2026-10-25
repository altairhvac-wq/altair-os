import {
  Bell,
  Briefcase,
  CalendarDays,
  Clock,
  Home,
  Receipt,
  User,
  type LucideIcon,
} from "lucide-react";
import { canAccessTechnicianNavItem, type TechnicianNavId } from "@/lib/database/access-control";
import type { ActiveCompanyContext } from "@/lib/database/types";

export type TechnicianNavItem = {
  id: TechnicianNavId;
  label: string;
  href: string;
  icon: LucideIcon;
  enabled: boolean;
  /**
   * Home matches only its exact path. Every other destination also matches
   * its sub-routes. Without this, "/technician/schedule" lit up the Home tab
   * because it started with "/technician".
   */
  match: "exact" | "prefix";
};

/**
 * The bottom tab bar is the ONE navigation surface in the technician shell.
 * Phone audit 2026-10-24: the hamburger drawer and the home-screen app grid
 * both listed these same destinations, so a technician saw three menus with
 * identical items. Schedule — the screen a technician actually works from —
 * was the only destination missing from the tab bar, so it is here now.
 *
 * Keep this to five items at most: five equal-width tabs fit a 320–430px
 * phone without horizontal scrolling. A sixth would have to scroll.
 */
export const technicianNavItems: TechnicianNavItem[] = [
  {
    id: "today",
    label: "Home",
    href: "/technician",
    icon: Home,
    enabled: true,
    match: "exact",
  },
  {
    id: "schedule",
    label: "Schedule",
    href: "/technician/schedule",
    icon: CalendarDays,
    enabled: true,
    match: "prefix",
  },
  {
    id: "jobs",
    label: "Jobs",
    href: "/tech/jobs",
    icon: Briefcase,
    enabled: false,
    match: "prefix",
  },
  {
    id: "time",
    label: "Time",
    href: "/tech/time",
    icon: Clock,
    enabled: true,
    match: "prefix",
  },
  {
    id: "receipts",
    label: "Receipts",
    href: "/tech/receipts",
    icon: Receipt,
    enabled: true,
    match: "prefix",
  },
  {
    id: "notifications",
    label: "Alerts",
    href: "/tech/notifications",
    icon: Bell,
    enabled: true,
    match: "prefix",
  },
  {
    id: "profile",
    label: "Profile",
    href: "/tech/profile",
    icon: User,
    enabled: false,
    match: "prefix",
  },
];

export function getTechnicianNavItems(
  context: ActiveCompanyContext,
): TechnicianNavItem[] {
  return technicianNavItems.filter(
    (item) => item.enabled && canAccessTechnicianNavItem(context, item.id),
  );
}

function matchesNavItem(pathname: string, item: TechnicianNavItem): boolean {
  if (pathname === item.href) {
    return true;
  }

  return item.match === "prefix" && pathname.startsWith(`${item.href}/`);
}

export function getTechnicianNavItemForPath(
  pathname: string,
  context?: ActiveCompanyContext,
): TechnicianNavItem {
  const items = context
    ? getTechnicianNavItems(context)
    : technicianNavItems.filter((item) => item.enabled);

  const match = items.find((item) => matchesNavItem(pathname, item));

  return match ?? items[0] ?? technicianNavItems[0];
}
