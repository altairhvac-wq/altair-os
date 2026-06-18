"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ActiveCompanyContext } from "@/lib/database/types";
import {
  northStarSidebarClass,
  northStarSidebarGroupLabelClass,
  northStarSidebarLinkActiveClass,
  northStarSidebarLinkClass,
} from "@/shared/design-system/shell/tokens";
import {
  getAdminNavItems,
  getGroupedAdminNavItems,
  isAdminNavItemActive,
  type NavItem,
} from "./nav-items";

type SidebarNavLinkProps = {
  item: NavItem;
  active: boolean;
};

function SidebarNavLink({ item, active }: SidebarNavLinkProps) {
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={`${northStarSidebarLinkClass} group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
        active ? northStarSidebarLinkActiveClass : ""
      }`}
    >
      {active ? (
        <span aria-hidden="true" className="admin-north-star-sidebar-rail" />
      ) : null}
      <Icon
        className={`h-4 w-4 shrink-0 ${
          active
            ? "text-[var(--north-star-brass)]"
            : "text-slate-500 group-hover:text-slate-400"
        }`}
        aria-hidden="true"
      />
      <span className="truncate">{item.label}</span>
    </Link>
  );
}

type SidebarNavProps = {
  companyContext: ActiveCompanyContext;
  showPlatformAdminNav?: boolean;
};

export function SidebarNav({
  companyContext,
  showPlatformAdminNav = false,
}: SidebarNavProps) {
  const pathname = usePathname();
  const navGroups = getGroupedAdminNavItems(companyContext, {
    includePlatformAdmin: showPlatformAdminNav,
  });
  const navItems = getAdminNavItems(companyContext);

  return (
    <aside
      aria-label="Desktop navigation"
      className={`${northStarSidebarClass} hidden w-[16rem] shrink-0 flex-col md:flex`}
    >
      <nav className="flex min-h-0 flex-1 flex-col overflow-y-auto px-3 py-4">
        <ul className="flex flex-col gap-7">
          {navGroups.map((group) => (
            <li key={group.id}>
              <p className={`mb-2.5 px-2.5 ${northStarSidebarGroupLabelClass}`}>
                {group.label}
              </p>
              <ul className="flex flex-col gap-1">
                {group.items.map((item) => (
                  <li key={item.href}>
                    <SidebarNavLink
                      item={item}
                      active={isAdminNavItemActive(pathname, item.href)}
                    />
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>

        {navItems.length <= 2 ? (
          <p className="mt-6 px-2.5 text-xs text-slate-500">
            Limited workspace access
          </p>
        ) : null}
      </nav>
    </aside>
  );
}
