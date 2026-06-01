import {
  adminNavItems,
  isPlatformAdminPath,
} from "@/shared/components/admin/nav-items";

function matchesAdminNavHref(pathname: string, href: string): boolean {
  return href === "/"
    ? pathname === "/"
    : pathname === href || pathname.startsWith(`${href}/`);
}

/** Admin shell routes (primary + More menu) that support mobile pull-to-refresh. */
export function isPullToRefreshRoute(pathname: string): boolean {
  if (isPlatformAdminPath(pathname)) {
    return true;
  }

  return adminNavItems.some((item) =>
    matchesAdminNavHref(pathname, item.href),
  );
}
