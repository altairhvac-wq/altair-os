import {
  BarChart3,
  Briefcase,
  Clock,
  DollarSign,
  FileText,
  LayoutDashboard,
  Network,
  Receipt,
  Settings,
  Truck,
  Users,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  description: string;
};

export const adminNavItems: NavItem[] = [
  {
    label: "Dashboard",
    href: "/",
    icon: LayoutDashboard,
    description: "Company overview and key metrics",
  },
  {
    label: "Dispatch",
    href: "/dispatch",
    icon: Truck,
    description: "Schedule and assign field work",
  },
  {
    label: "Customers",
    href: "/customers",
    icon: Users,
    description: "Manage customer profiles and locations",
  },
  {
    label: "Jobs",
    href: "/jobs",
    icon: Briefcase,
    description: "Track active and completed jobs",
  },
  {
    label: "Estimates",
    href: "/estimates",
    icon: FileText,
    description: "Create and send customer estimates",
  },
  {
    label: "Invoices",
    href: "/invoices",
    icon: Receipt,
    description: "Billing and payment tracking",
  },
  {
    label: "Expenses",
    href: "/expenses",
    icon: DollarSign,
    description: "Receipts, mileage, and expense categories",
  },
  {
    label: "Time Clock",
    href: "/time",
    icon: Clock,
    description: "Field hours, clock in/out, and approvals",
  },
  {
    label: "Network",
    href: "/network",
    icon: Network,
    description: "Subcontractor networking and bids",
  },
  {
    label: "Reports",
    href: "/reports",
    icon: BarChart3,
    description: "Revenue and productivity insights",
  },
  {
    label: "Settings",
    href: "/settings",
    icon: Settings,
    description: "Company and platform configuration",
  },
];

export function getNavItemForPath(pathname: string): NavItem {
  const match = adminNavItems.find(
    (item) =>
      item.href === "/"
        ? pathname === "/"
        : pathname === item.href || pathname.startsWith(`${item.href}/`),
  );

  return match ?? adminNavItems[0];
}
