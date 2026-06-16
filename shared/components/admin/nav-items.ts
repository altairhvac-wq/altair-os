import {
  BarChart3,
  BookOpen,
  Briefcase,
  Bug,
  Clock,
  DollarSign,
  FileText,
  LayoutDashboard,
  Network,
  Receipt,
  Settings,
  Shield,
  Target,
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
    label: "Leads",
    href: "/leads",
    icon: Target,
    description: "Track opportunities before they become customers",
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
    label: "Labor & payroll",
    href: "/time-clock",
    icon: Clock,
    description: "Active technicians, time entries, and payroll review",
  },
  {
    label: "Network",
    href: "/network",
    icon: Network,
    description: "Trusted partners, overflow work, and coverage (early access)",
  },
  {
    label: "Reports",
    href: "/reports",
    icon: BarChart3,
    description: "Revenue and productivity insights",
  },
  {
    label: "Alpha Tracker",
    href: "/alpha-tracker",
    icon: Bug,
    description: "Internal bug and feature tracking for alpha testing",
  },
  {
    label: "Settings",
    href: "/settings",
    icon: Settings,
    description: "Company and platform configuration",
  },
];

/** Shown only to platform admins (server-gated); not part of tenant role nav. */
export const platformAdminNavItem: NavItem = {
  label: "Platform",
  href: "/platform",
  icon: Shield,
  description: "Internal beta visibility (app owner only)",
};

export function isPlatformAdminPath(pathname: string): boolean {
  return pathname === "/platform" || pathname.startsWith("/platform/");
}

/** /time (labor review) and /time-clock (shift exceptions) share one nav item. */
export function isLaborPayrollPath(pathname: string): boolean {
  return (
    pathname === "/time" ||
    pathname.startsWith("/time/") ||
    pathname === "/time-clock" ||
    pathname.startsWith("/time-clock/")
  );
}

/** Two-row mobile nav: row 1 = ops hub, row 2 = billing + overflow. */
export const PRIMARY_MOBILE_ADMIN_NAV_ROWS = [
  ["/", "/jobs", "/dispatch", "/customers"],
  ["/leads", "/estimates", "/invoices", "/price-book"],
] as const;

export const PRIMARY_MOBILE_ADMIN_NAV_HREFS =
  PRIMARY_MOBILE_ADMIN_NAV_ROWS.flat();

/** Left-to-right desktop tab order (workflow-first, admin items last). */
export const DESKTOP_ADMIN_NAV_WORKFLOW_ORDER = [
  "/",
  "/jobs",
  "/customers",
  "/leads",
  "/dispatch",
  "/estimates",
  "/price-book",
  "/invoices",
  "/expenses",
  "/reports",
  "/network",
  "/alpha-tracker",
  "/settings",
  "/time-clock",
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
  primaryRows: NavItem[][];
  secondary: NavItem[];
} {
  const items = getAdminNavItems(context);
  const itemsByHref = new Map(items.map((item) => [item.href, item]));
  const primaryHrefs = new Set<string>(PRIMARY_MOBILE_ADMIN_NAV_HREFS);

  const primaryRows = PRIMARY_MOBILE_ADMIN_NAV_ROWS.map((row) =>
    row
      .map((href) => itemsByHref.get(href))
      .filter((item): item is NavItem => item !== undefined),
  );

  const secondary = items.filter((item) => !primaryHrefs.has(item.href));

  return { primaryRows, secondary };
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
  options?: { includePlatformAdmin?: boolean },
): NavItem {
  if (options?.includePlatformAdmin && isPlatformAdminPath(pathname)) {
    if (pathname === "/platform/bugs" || pathname.startsWith("/platform/bugs/")) {
      return {
        ...platformAdminNavItem,
        label: "Bug reports",
        description: "Beta feedback submitted from inside the app",
      };
    }

    return platformAdminNavItem;
  }

  if (isLaborPayrollPath(pathname)) {
    const laborItem = adminNavItems.find((item) => item.href === "/time-clock");

    if (laborItem) {
      return laborItem;
    }
  }

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
