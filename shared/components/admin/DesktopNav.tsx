"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ActiveCompanyContext } from "@/lib/database/types";
import {
  getAdminNavItems,
  getOrderedAdminNavItemsForDesktop,
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
      className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg px-2.5 py-1.5 text-sm font-medium transition-colors ${
        active
          ? "bg-cyan-500/12 text-cyan-800 ring-1 ring-cyan-500/15"
          : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
      }`}
    >
      <Icon
        className={`h-4 w-4 shrink-0 ${active ? "text-cyan-700" : "text-slate-500"}`}
      />
      {item.label}
    </Link>
  );
}

type DesktopNavProps = {
  companyContext: ActiveCompanyContext;
};

export function DesktopNav({ companyContext }: DesktopNavProps) {
  const pathname = usePathname();
  const navItems = getAdminNavItems(companyContext);
  const orderedNavItems = getOrderedAdminNavItemsForDesktop(companyContext);

  return (
    <nav
      aria-label="Desktop navigation"
      className="relative z-30 hidden w-full max-w-full shrink-0 border-b border-slate-200/90 bg-white shadow-[0_1px_2px_rgb(15_23_42_/_0.03)] md:block"
    >
      <div className="flex min-w-0 items-center gap-2 px-4 sm:px-6">
        <ul className="flex min-w-0 flex-1 flex-wrap items-center gap-0.5 py-1.5">
          {orderedNavItems.map((item) => (
            <li key={item.href} className="shrink-0">
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
