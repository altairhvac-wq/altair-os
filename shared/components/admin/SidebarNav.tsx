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
  const testId = `nav-link-${item.href === "/" ? "dashboard" : item.href.slice(1).replace(/\//g, "-")}`;

  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      data-testid={testId}
      /* The rail hides the label visually, so the tooltip is the only way a
       * sighted pointer user can confirm a destination between 768 and 1023. */
      title={item.label}
      className={`${northStarSidebarLinkClass} group relative flex items-center gap-3 rounded-lg px-3 pb-3 pt-2 text-sm transition-[background-color,color] duration-150 max-lg:justify-center max-lg:gap-0 max-lg:px-0 ${
        active
          ? `${northStarSidebarLinkActiveClass} font-semibold`
          : "font-medium"
      }`}
    >
      <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
      {/* `sr-only`, not `hidden`: a display:none label is not announced, which
       * would leave every rail link an unnamed icon to a screen reader. */}
      <span className="truncate max-lg:sr-only">{item.label}</span>
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
      className={`${northStarSidebarClass} hidden shrink-0 flex-col md:flex`}
    >
      <nav className="flex min-h-0 flex-1 flex-col overflow-y-auto px-3 py-4">
        <ul className="flex flex-col gap-7">
          {navGroups.map((group) => (
            <li key={group.id}>
              {/* Group headings would wrap to three lines in a 68px rail.
                  Hidden visually below `lg` — the `gap-7` between groups still
                  reads as grouping — but kept in the accessibility tree. */}
              <p
                className={`mb-2.5 px-2.5 max-lg:sr-only ${northStarSidebarGroupLabelClass}`}
              >
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
          <p className="mt-6 px-2.5 text-xs text-[var(--north-star-sidebar-link)] max-lg:sr-only">
            Limited workspace access
          </p>
        ) : null}
      </nav>
    </aside>
  );
}
