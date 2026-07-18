import {
  BarChart3,
  BookOpen,
  Briefcase,
  Bug,
  Clock,
  DollarSign,
  FileText,
  LayoutDashboard,
  Megaphone,
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
    label: "Marketing",
    href: "/marketing",
    icon: Megaphone,
    description: "Draft and track company marketing posts",
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
    href: "/time",
    icon: Clock,
    description: "Active technicians, time entries, and payroll review",
  },
  {
    label: "Network",
    href: "/network",
    icon: Network,
    description: "Trusted partners, overflow work, and coverage",
  },
  {
    label: "Reports",
    href: "/reports",
    icon: BarChart3,
    description: "Revenue and productivity insights",
  },
  {
    label: "Feedback",
    href: "/alpha-tracker",
    icon: Bug,
    description: "Report issues and product feedback",
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

/** Shared active-path matching for admin nav links (desktop, mobile, sidebar). */
export function isAdminNavItemActive(pathname: string, href: string): boolean {
  if (href === "/") {
    return pathname === "/";
  }

  if (href === "/time" && isLaborPayrollPath(pathname)) {
    return true;
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export type NavGroup = {
  id: string;
  label: string;
  hrefs: readonly string[];
};

export type NavGroupWithItems = {
  id: string;
  label: string;
  items: NavItem[];
};

/** Presentation-only grouping for North Star sidebar — reuses permission-filtered nav items. */
export const ADMIN_NAV_GROUP_DEFINITIONS: NavGroup[] = [
  {
    id: "command",
    label: "Command",
    hrefs: ["/", "/alpha-tracker", "/reports"],
  },
  {
    id: "work",
    label: "Work",
    hrefs: ["/jobs", "/dispatch", "/estimates", "/price-book"],
  },
  {
    id: "money",
    label: "Money",
    hrefs: ["/invoices", "/expenses", "/time"],
  },
  {
    id: "relationships",
    label: "Relationships",
    hrefs: ["/customers", "/leads", "/marketing", "/network"],
  },
  {
    id: "company",
    label: "Company",
    hrefs: ["/settings", "/platform"],
  },
];

export function getGroupedAdminNavItems(
  context: ActiveCompanyContext,
  options?: { includePlatformAdmin?: boolean },
): NavGroupWithItems[] {
  const itemsByHref = new Map(
    getAdminNavItems(context).map((item) => [item.href, item]),
  );

  if (options?.includePlatformAdmin) {
    itemsByHref.set("/platform", platformAdminNavItem);
  }

  const groups: NavGroupWithItems[] = [];

  for (const group of ADMIN_NAV_GROUP_DEFINITIONS) {
    const items: NavItem[] = [];

    for (const href of group.hrefs) {
      if (href === "/platform" && !options?.includePlatformAdmin) {
        continue;
      }

      const item = itemsByHref.get(href);

      if (item) {
        items.push(item);
      }
    }

    if (items.length > 0) {
      groups.push({ id: group.id, label: group.label, items });
    }
  }

  return groups;
}

/** Single-row mobile nav: four daily destinations plus the More menu. */
export const PRIMARY_MOBILE_ADMIN_NAV_ROWS = [
  ["/", "/jobs", "/dispatch", "/customers"],
  [],
] as const;

export const PRIMARY_MOBILE_ADMIN_NAV_HREFS =
  PRIMARY_MOBILE_ADMIN_NAV_ROWS.flat();

/** Left-to-right desktop tab order (workflow-first, admin items last). */
export const DESKTOP_ADMIN_NAV_WORKFLOW_ORDER = [
  "/",
  "/jobs",
  "/customers",
  "/leads",
  "/marketing",
  "/dispatch",
  "/estimates",
  "/price-book",
  "/invoices",
  "/expenses",
  "/reports",
  "/network",
  "/alpha-tracker",
  "/settings",
  "/time",
] as const;

export function getAdminNavItems(context: ActiveCompanyContext): NavItem[] {
  const visibleHrefs = new Set(getAccessibleAdminNavHrefs(context));

  return adminNavItems.filter((item) => {
    const permissionHref = item.href === "/time" ? "/time-clock" : item.href;

    if (!isAdminNavHref(permissionHref)) {
      return false;
    }

    return visibleHrefs.has(permissionHref);
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
    const laborItem = adminNavItems.find((item) => item.href === "/time");

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
