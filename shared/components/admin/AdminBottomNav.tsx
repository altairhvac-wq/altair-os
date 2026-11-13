"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import type { ActiveCompanyContext } from "@/lib/database/types";
import {
  getAdminNavItems,
  isAdminNavItemActive,
  type NavItem,
} from "./nav-items";

/**
 * The office app's navigation on a phone: one tab bar at the bottom.
 *
 * ==================== WHY THIS REPLACED THREE THINGS ====================
 * UI audit 2026-11-12, and the owner's own report more than once: a phone
 * had three ways to get around. A menu button in the top bar, a strip of
 * icons under it that scrolled sideways (five of about thirteen places
 * visible, no hint that it scrolled), and a second menu button on the home
 * screen. All three listed the same places.
 *
 * Now there is one bar, at the bottom, where a thumb reaches. It holds the
 * four places an owner or dispatcher opens most, and a fifth tab, Menu, that
 * opens the full list. Thirteen places do not fit in a tab bar, so "four
 * plus Menu" is the smallest honest answer: two ways, never three.
 *
 * ==================== RULES ====================
 * - At most four destinations plus Menu. A new destination goes in the menu.
 * - Tabs are chosen from PRIMARY_ORDER by what this person may open, so a
 *   role that cannot see Sales still gets four useful tabs.
 * - When the current page is not one of the four, the Menu tab is marked,
 *   so the bar always shows where you are.
 */

/** Most-used first. The first four this person can open become the tabs. */
const PRIMARY_ORDER = ["/", "/work", "/sales", "/customers", "/dispatch", "/team", "/reports"];
const TAB_COUNT = 4;

/** Short labels for a 390px bar; the menu keeps the full names. */
const TAB_LABELS: Record<string, string> = { "/": "Home" };

export function getAdminBottomNavItems(context: ActiveCompanyContext): NavItem[] {
  const byHref = new Map(getAdminNavItems(context).map((item) => [item.href, item]));
  return PRIMARY_ORDER.map((href) => byHref.get(href))
    .filter((item): item is NavItem => item !== undefined)
    .slice(0, TAB_COUNT);
}

const TAB_CLASS =
  "relative flex min-h-14 w-full touch-manipulation flex-col items-center justify-center gap-1 rounded-2xl px-1 py-1.5 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-altair-brass";
const TAB_ACTIVE_CLASS = "bg-altair-brass/15 text-altair-ink-on-paper";
const TAB_IDLE_CLASS = "text-altair-ink-on-paper-muted active:bg-altair-paper-subtle";

type AdminBottomNavProps = {
  companyContext: ActiveCompanyContext;
  menuOpen: boolean;
  onMenuOpenChange: (open: boolean) => void;
};

export function AdminBottomNav({ companyContext, menuOpen, onMenuOpenChange }: AdminBottomNavProps) {
  const pathname = usePathname();
  const tabs = getAdminBottomNavItems(companyContext);
  const activeHref = tabs.find((item) => isAdminNavItemActive(pathname, item.href))?.href ?? null;
  const menuMarked = menuOpen || activeHref === null;

  return (
    <nav
      aria-label="Mobile navigation"
      className="admin-bottom-nav no-print fixed inset-x-0 bottom-0 z-30 md:hidden"
    >
      <ul className="flex items-stretch gap-1 px-2 pb-[max(0.375rem,env(safe-area-inset-bottom,0px))] pt-1.5">
        {tabs.map((item) => {
          const Icon = item.icon;
          const active = item.href === activeHref && !menuOpen;
          const testId = `mobile-nav-link-${item.href === "/" ? "dashboard" : item.href.slice(1).replace(/\//g, "-")}`;

          return (
            <li key={item.href} className="min-w-0 flex-1">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                data-testid={testId}
                className={`${TAB_CLASS} ${active ? TAB_ACTIVE_CLASS : TAB_IDLE_CLASS}`}
              >
                <Icon
                  className={`h-[22px] w-[22px] ${active ? "stroke-[2.25] text-[var(--brand-metal-text)]" : ""}`}
                  aria-hidden="true"
                />
                <span className={`w-full truncate text-center text-[11px] leading-none ${active ? "font-bold" : "font-semibold"}`}>
                  {TAB_LABELS[item.href] ?? item.label}
                </span>
              </Link>
            </li>
          );
        })}
        <li className="min-w-0 flex-1">
          <button
            type="button"
            aria-expanded={menuOpen}
            aria-controls="quick-navigation-drawer"
            aria-label={menuOpen ? "Close quick navigation" : "Open quick navigation"}
            data-testid="quick-nav-toggle"
            onClick={() => onMenuOpenChange(!menuOpen)}
            className={`${TAB_CLASS} ${menuMarked ? TAB_ACTIVE_CLASS : TAB_IDLE_CLASS}`}
          >
            <Menu
              className={`h-[22px] w-[22px] ${menuMarked ? "stroke-[2.25] text-[var(--brand-metal-text)]" : ""}`}
              aria-hidden="true"
            />
            <span className={`w-full truncate text-center text-[11px] leading-none ${menuMarked ? "font-bold" : "font-semibold"}`}>
              Menu
            </span>
          </button>
        </li>
      </ul>
    </nav>
  );
}
