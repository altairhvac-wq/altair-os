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
  isLaborPayrollPath,
  platformAdminNavItem,
  type NavItem,
} from "./nav-items";

function isActivePath(pathname: string, href: string) {
  if (href === "/") {
    return pathname === "/";
  }

  if (href === "/time" && isLaborPayrollPath(pathname)) {
    return true;
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
      className={`${adminNavLinkClass} flex shrink-0 items-center gap-2 whitespace-nowrap rounded-lg px-2.5 pb-2.5 pt-1.5 text-sm ${
        active
          ? `${adminNavLinkActiveClass} font-semibold text-altair-graphite`
          : "font-medium text-altair-ink-on-paper-muted hover:bg-slate-100/70 hover:text-altair-graphite"
      }`}
    >
      <Icon
        className={`h-4 w-4 shrink-0 ${
          active
            ? "text-altair-brass"
            : "text-altair-ink-on-paper-muted group-hover:text-altair-graphite"
        }`}
        aria-hidden="true"
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
