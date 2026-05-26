import {
  BarChart3,
  BookOpen,
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
import {
  getAccessibleAdminNavHrefs,
  isAdminNavHref,
} from "@/lib/database/access-control";
import type { ActiveCompanyContext } from "@/lib/database/types";

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
    label: "Price Book",
    href: "/price-book",
    icon: BookOpen,
    description: "Manage reusable services and parts for estimates",
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

export const PRIMARY_MOBILE_ADMIN_NAV_HREFS = [
  "/",
  "/jobs",
  "/dispatch",
  "/customers",
] as const;

/** Left-to-right desktop tab order (workflow-first, admin items last). */
export const DESKTOP_ADMIN_NAV_WORKFLOW_ORDER = [
  "/",
  "/customers",
  "/jobs",
  "/dispatch",
  "/estimates",
  "/price-book",
  "/invoices",
  "/expenses",
  "/reports",
  "/time",
  "/network",
  "/settings",
] as const;

export function getAdminNavItems(context: ActiveCompanyContext): NavItem[] {
  const visibleHrefs = new Set(getAccessibleAdminNavHrefs(context));

  return adminNavItems.filter((item) => {
    if (!isAdminNavHref(item.href)) {
      return false;
    }

    return visibleHrefs.has(item.href);
  });
}

export function splitAdminNavItemsForMobile(context: ActiveCompanyContext): {
  primary: NavItem[];
  secondary: NavItem[];
} {
  const items = getAdminNavItems(context);
  const primaryHrefs = new Set<string>(PRIMARY_MOBILE_ADMIN_NAV_HREFS);
  const primary: NavItem[] = [];

  for (const href of PRIMARY_MOBILE_ADMIN_NAV_HREFS) {
    const item = items.find((entry) => entry.href === href);

    if (item) {
      primary.push(item);
    }
  }

  const secondary = items.filter((item) => !primaryHrefs.has(item.href));

  return { primary, secondary };
}

export function getOrderedAdminNavItemsForDesktop(
  context: ActiveCompanyContext,
): NavItem[] {
  const items = getAdminNavItems(context);
  const itemsByHref = new Map(items.map((item) => [item.href, item]));
  const ordered: NavItem[] = [];
  const seen = new Set<string>();

  for (const href of DESKTOP_ADMIN_NAV_WORKFLOW_ORDER) {
    const item = itemsByHref.get(href);

    if (item) {
      ordered.push(item);
      seen.add(href);
    }
  }

  for (const item of items) {
    if (!seen.has(item.href)) {
      ordered.push(item);
    }
  }

  return ordered;
}

/** @deprecated Use getAdminNavItems instead */
export function getAdminMobileNavItems(context: ActiveCompanyContext): NavItem[] {
  return getAdminNavItems(context);
}

export function getNavItemForPath(
  pathname: string,
  context?: ActiveCompanyContext,
): NavItem {
  const match = adminNavItems.find(
    (item) =>
      item.href === "/"
        ? pathname === "/"
        : pathname === item.href || pathname.startsWith(`${item.href}/`),
  );

  if (match) {
    return match;
  }

  if (context) {
    const visibleItems = getAdminNavItems(context);
    return visibleItems[0] ?? adminNavItems[0];
  }

  return adminNavItems[0];
}
