import {
  BarChart3,
  BookOpen,
  Briefcase,
  CalendarDays,
  Clock,
  DollarSign,
  HardHat,
  LayoutDashboard,
  Megaphone,
  Network,
  Receipt,
  Settings,
  Shield,
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
    description: "Day board — assign and run field work",
  },
  {
    label: "Schedule",
    href: "/schedule",
    icon: CalendarDays,
    description: "Week overview linking into the dispatch day board",
  },
  {
    label: "Team",
    href: "/team",
    icon: HardHat,
    description: "Technicians roster and time clock",
  },
  {
    label: "Customers",
    href: "/customers",
    icon: Users,
    description: "Customers, lead pipeline, and archived records",
  },
  {
    label: "Marketing",
    href: "/marketing",
    icon: Megaphone,
    description: "Draft and track company marketing posts",
  },
  {
    label: "Work",
    href: "/work",
    icon: Briefcase,
    description: "Jobs list and day-to-day field work",
  },
  {
    label: "Sales",
    href: "/sales",
    icon: Receipt,
    description: "Estimates, invoices, and collected payments",
  },
  {
    label: "Price Book",
    href: "/price-book",
    icon: BookOpen,
    description: "Manage reusable services and parts for estimates",
  },
  {
    label: "Expenses",
    href: "/expenses",
    icon: DollarSign,
    description: "Receipts, mileage, and expense categories",
  },
  {
    label: "Payroll",
    href: "/payroll",
    icon: Clock,
    description: "Active technicians, time entries, and payroll review",
  },
  {
    label: "Community",
    href: "/community",
    icon: Network,
    description: "Business relationships, referrals, and local discovery",
  },
  {
    label: "Reports",
    href: "/reports",
    icon: BarChart3,
    description: "Revenue and productivity insights",
  },
  // "Feedback" (/alpha-tracker) was removed from nav: the floating
  // BetaBugReportButton in AdminShell already provides feedback entry on
  // every page, and the alpha tracker itself is a legacy destination. The
  // route stays mounted for deep links.
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

/** Payroll (canonical /payroll; legacy /time redirects here). Time Clock lives under Team (?tab=time-clock). */
export function isLaborPayrollPath(pathname: string): boolean {
  return (
    pathname === "/payroll" ||
    pathname.startsWith("/payroll/") ||
    pathname === "/time" ||
    pathname.startsWith("/time/")
  );
}

/** Team hub + member profile routes share one nav item. */
export function isTeamHubPath(pathname: string): boolean {
  return pathname === "/team" || pathname.startsWith("/team/");
}

/** Sales hub list + legacy estimate/invoice/payment list redirects. */
export function isSalesHubPath(pathname: string): boolean {
  return (
    pathname === "/sales" ||
    pathname.startsWith("/sales/") ||
    pathname === "/estimates" ||
    pathname === "/invoices" ||
    pathname === "/payments"
  );
}

/** Shared active-path matching for admin nav links (desktop, mobile, sidebar). */
export function isAdminNavItemActive(pathname: string, href: string): boolean {
  if (href === "/") {
    return pathname === "/";
  }

  if (href === "/payroll" && isLaborPayrollPath(pathname)) {
    return true;
  }

  if (href === "/team" && isTeamHubPath(pathname)) {
    return true;
  }

  if (href === "/sales") {
    if (isSalesHubPath(pathname)) {
      return true;
    }

    // Detail routes stay under /estimates/[id] and /invoices/[id].
    if (
      pathname.startsWith("/estimates/") ||
      pathname.startsWith("/invoices/")
    ) {
      return true;
    }
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
    hrefs: ["/", "/reports"],
  },
  {
    id: "work",
    label: "Work",
    hrefs: ["/work", "/dispatch", "/team", "/price-book"],
  },
  {
    id: "sales",
    label: "Sales",
    hrefs: ["/sales"],
  },
  {
    id: "money",
    label: "Money",
    hrefs: ["/expenses", "/payroll"],
  },
  {
    id: "relationships",
    label: "Relationships",
    hrefs: ["/customers", "/marketing", "/community"],
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

/**
 * Left-to-right mobile bottom-rail order (workflow-first).
 * Permission filtering still decides which destinations appear.
 */
export const MOBILE_ADMIN_BOTTOM_RAIL_ORDER = [
  "/",
  "/work",
  "/dispatch",
  "/team",
  "/customers",
  "/sales",
  "/expenses",
  "/reports",
  "/marketing",
  "/price-book",
  "/payroll",
  "/community",
  "/settings",
] as const;

/** @deprecated Prefer MOBILE_ADMIN_BOTTOM_RAIL_ORDER — More overflow is removed. */
export const PRIMARY_MOBILE_ADMIN_NAV_ROWS = [
  ["/", "/work", "/dispatch", "/customers"],
  [],
] as const;

/** @deprecated Prefer MOBILE_ADMIN_BOTTOM_RAIL_ORDER */
export const PRIMARY_MOBILE_ADMIN_NAV_HREFS =
  PRIMARY_MOBILE_ADMIN_NAV_ROWS.flat();

/** Left-to-right desktop tab order (workflow-first, admin items last). */
export const DESKTOP_ADMIN_NAV_WORKFLOW_ORDER = [
  "/",
  "/work",
  "/customers",
  "/marketing",
  "/dispatch",
  "/team",
  "/sales",
  "/price-book",
  "/expenses",
  "/reports",
  "/community",
  "/settings",
  "/payroll",
] as const;

export function getAdminNavItems(context: ActiveCompanyContext): NavItem[] {
  const visibleHrefs = new Set(getAccessibleAdminNavHrefs(context));

  return adminNavItems.filter((item) => {
    // Schedule lives in the header calendar icon — not primary nav.
    if (item.href === "/schedule") {
      return false;
    }

    // Permission keys equal routes (ALTAIR_ARCHITECTURE.md §2) — /payroll
    // and /community are first-class AdminNavHrefs now, so no indirection.
    const permissionHref = item.href;

    if (!isAdminNavHref(permissionHref)) {
      return false;
    }

    return visibleHrefs.has(permissionHref);
  });
}

/**
 * @deprecated More overflow is removed. Use getOrderedAdminNavItemsForMobile.
 */
export function splitAdminNavItemsForMobile(context: ActiveCompanyContext): {
  primaryRows: NavItem[][];
  secondary: NavItem[];
} {
  const ordered = getOrderedAdminNavItemsForMobile(context);
  return { primaryRows: [ordered], secondary: [] };
}

/** Permission-filtered destinations in mobile bottom-rail order. */
export function getOrderedAdminNavItemsForMobile(
  context: ActiveCompanyContext,
  options?: { includePlatformAdmin?: boolean },
): NavItem[] {
  const items = getAdminNavItems(context);
  const itemsByHref = new Map(items.map((item) => [item.href, item]));
  const ordered: NavItem[] = [];
  const seen = new Set<string>();

  for (const href of MOBILE_ADMIN_BOTTOM_RAIL_ORDER) {
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

  if (options?.includePlatformAdmin) {
    ordered.push(platformAdminNavItem);
  }

  return ordered;
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
    const laborItem = adminNavItems.find((item) => item.href === "/payroll");

    if (laborItem) {
      return laborItem;
    }
  }

  if (isTeamHubPath(pathname)) {
    const teamItem = adminNavItems.find((item) => item.href === "/team");

    if (teamItem) {
      return teamItem;
    }
  }

  if (
    isSalesHubPath(pathname) ||
    pathname.startsWith("/estimates/") ||
    pathname.startsWith("/invoices/")
  ) {
    const salesItem = adminNavItems.find((item) => item.href === "/sales");

    if (salesItem) {
      return salesItem;
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
