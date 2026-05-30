import {
  Bell,
  Briefcase,
  CalendarDays,
  Clock,
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
};

export const technicianNavItems: TechnicianNavItem[] = [
  {
    id: "today",
    label: "Today",
    href: "/technician",
    icon: CalendarDays,
    enabled: true,
  },
  {
    id: "jobs",
    label: "Jobs",
    href: "/tech/jobs",
    icon: Briefcase,
    enabled: false,
  },
  {
    id: "time",
    label: "Time",
    href: "/tech/time",
    icon: Clock,
    enabled: false,
  },
  {
    id: "receipts",
    label: "Receipts",
    href: "/tech/receipts",
    icon: Receipt,
    enabled: true,
  },
  {
    id: "notifications",
    label: "Alerts",
    href: "/tech/notifications",
    icon: Bell,
    enabled: true,
  },
  {
    id: "profile",
    label: "Profile",
    href: "/tech/profile",
    icon: User,
    enabled: false,
  },
];

export function getTechnicianNavItems(
  context: ActiveCompanyContext,
): TechnicianNavItem[] {
  return technicianNavItems.filter(
    (item) => item.enabled && canAccessTechnicianNavItem(context, item.id),
  );
}

export function getTechnicianNavItemForPath(
  pathname: string,
  context?: ActiveCompanyContext,
): TechnicianNavItem {
  const items = context
    ? getTechnicianNavItems(context)
    : technicianNavItems.filter((item) => item.enabled);

  const match = items.find(
    (item) =>
      item.href === "/technician"
        ? pathname === "/technician"
        : pathname === item.href || pathname.startsWith(`${item.href}/`),
  );

  return match ?? items[0] ?? technicianNavItems[0];
}
