import {
  Briefcase,
  CalendarDays,
  Clock,
  Receipt,
  User,
  type LucideIcon,
} from "lucide-react";

export type TechnicianNavItem = {
  id: string;
  label: string;
  href: string;
  icon: LucideIcon;
  enabled: boolean;
};

export const technicianNavItems: TechnicianNavItem[] = [
  {
    id: "today",
    label: "Today",
    href: "/tech",
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
    enabled: false,
  },
  {
    id: "profile",
    label: "Profile",
    href: "/tech/profile",
    icon: User,
    enabled: false,
  },
];

export function getTechnicianNavItemForPath(
  pathname: string,
): TechnicianNavItem {
  const match = technicianNavItems.find(
    (item) =>
      item.href === "/tech"
        ? pathname === "/tech"
        : pathname === item.href || pathname.startsWith(`${item.href}/`),
  );

  return match ?? technicianNavItems[0];
}
