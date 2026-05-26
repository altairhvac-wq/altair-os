import { PRIMARY_MOBILE_ADMIN_NAV_HREFS } from "@/shared/components/admin/nav-items";

export function isPullToRefreshRoute(pathname: string): boolean {
  return PRIMARY_MOBILE_ADMIN_NAV_HREFS.some((href) =>
    href === "/"
      ? pathname === "/"
      : pathname === href || pathname.startsWith(`${href}/`),
  );
}
