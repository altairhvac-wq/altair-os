"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ActiveCompanyContext } from "@/lib/database/types";
import {
  adminNavLinkActiveClass,
  adminNavLinkClass,
} from "@/shared/design-system/shell/tokens";
import {
  getAdminNavItems,
  getOrderedAdminNavItemsForDesktop,
  platformAdminNavItem,
  type NavItem,
} from "./nav-items";

function isActivePath(pathname: string, href: string) {
  if (href === "/") {
    return pathname === "/";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

type DesktopNavLinkProps = {
  item: NavItem;
  active: boolean;
};

function DesktopNavLink({ item, active }: DesktopNavLinkProps) {
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={`${adminNavLinkClass} flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg px-2.5 py-1.5 text-sm font-medium ${
        active
          ? `${adminNavLinkActiveClass} text-cyan-950`
          : "text-slate-600 hover:bg-white/70 hover:text-slate-900"
      }`}
    >
      <Icon
        className={`h-4 w-4 shrink-0 ${
          active ? "text-cyan-700" : "text-slate-500 group-hover:text-slate-700"
        }`}
      />
      {item.label}
    </Link>
  );
}

type DesktopNavProps = {
  companyContext: ActiveCompanyContext;
  showPlatformAdminNav?: boolean;
};

export function DesktopNav({
  companyContext,
  showPlatformAdminNav = false,
}: DesktopNavProps) {
  const pathname = usePathname();
  const navItems = getAdminNavItems(companyContext);
  const orderedNavItems = [
    ...getOrderedAdminNavItemsForDesktop(companyContext),
    ...(showPlatformAdminNav ? [platformAdminNavItem] : []),
  ];

  return (
    <nav
      aria-label="Desktop navigation"
      className="admin-premium-nav relative z-30 hidden w-full max-w-full shrink-0 md:block"
    >
      <div className="flex min-w-0 items-center gap-2 px-4 sm:px-6">
        <ul className="flex min-w-0 flex-1 flex-wrap items-center gap-0.5 py-1.5">
          {orderedNavItems.map((item) => (
            <li key={item.href} className="group shrink-0">
              <DesktopNavLink
                item={item}
                active={isActivePath(pathname, item.href)}
              />
            </li>
          ))}
        </ul>

        {navItems.length <= 2 ? (
          <p className="hidden max-w-xs shrink-0 truncate text-xs text-slate-500 lg:block">
            Limited workspace access
          </p>
        ) : null}
      </div>
    </nav>
  );
}
