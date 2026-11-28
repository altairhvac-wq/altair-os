"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import {
  Building2,
  Calculator,
  CreditCard,
  LayoutDashboard,
  Plug,
  Users,
  type LucideIcon,
} from "lucide-react";

const BUSINESS_NUMBERS_HREF = "/settings/business-numbers";

type SettingsNavigationItem = {
  label: string;
  description: string;
  href: string;
  exact?: boolean;
  icon: LucideIcon;
};

/**
 * Settings IA v2 — Preferences and Documents merged into Company;
 * Notifications retired (the header bell is the notifications UI); System
 * Check reachable from Overview's owner tile. Legacy routes all
 * server-redirect, so plain prefix matching covers every pathname a user can
 * sit on.
 *
 * Integrations was merged into Company too, and has been un-merged twice
 * over: first for the founder's marketing channels (nine providers, each
 * with its own connection health), then on 2026-11-27 for every company. It
 * is now the one place an owner reads what Altair connects to today, what it
 * does not yet, and asks for what they need. Altair's own marketing channels
 * sit at the bottom of that page, for platform admins only.
 */
const SETTINGS_NAVIGATION_ITEMS: readonly SettingsNavigationItem[] = [
  {
    label: "Overview",
    description: "What is set up and what still needs you.",
    href: "/settings",
    exact: true,
    icon: LayoutDashboard,
  },
  {
    label: "Company",
    description: "Name, address, and what goes on estimates and invoices.",
    href: "/settings/company",
    icon: Building2,
  },
  {
    // "Numbers", not "Business numbers": on a phone this is one of five or six
    // tabs across the screen and the longer name is cut off.
    label: "Numbers",
    description: "Your rate, your fees and what an hour costs you.",
    href: BUSINESS_NUMBERS_HREF,
    icon: Calculator,
  },
  {
    label: "Billing",
    description: "Your Altair plan and taking card payments.",
    href: "/settings/billing",
    icon: CreditCard,
  },
  {
    label: "Integrations",
    description: "What Altair connects to, and what to ask for.",
    href: "/settings/integrations",
    icon: Plug,
  },
  {
    label: "Users",
    description: "Who has access, their roles, and invitations.",
    href: "/settings/users",
    icon: Users,
  },
];

type SettingsNavigationProps = {
  /** Kept for call-site compatibility; System Check now lives on Overview. */
  showSystemCheck?: boolean;
  /**
   * Business numbers needs migration 218. Until a database has it the section
   * is left out of the list rather than shown and unable to save.
   */
  showBusinessNumbers?: boolean;
};

function isSettingsItemActive(
  pathname: string,
  item: SettingsNavigationItem,
): boolean {
  if (item.exact) {
    return pathname === item.href;
  }

  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

export function SettingsNavigation({
  showBusinessNumbers = false,
}: SettingsNavigationProps) {
  const pathname = usePathname();
  const items = SETTINGS_NAVIGATION_ITEMS.filter(
    (item) => showBusinessNumbers || item.href !== BUSINESS_NUMBERS_HREF,
  );

  return (
    <nav aria-label="Settings categories" className="min-w-0 lg:sticky lg:top-2">
      {/*
       * One list, two shapes. Below the desktop width it is a row of equal
       * tabs that always fits the screen (icon over label), so no section is
       * cut off or hidden behind a sideways scroll. From the desktop width
       * up it is a list down the left, each section with a line saying what
       * is in it.
       */}
      <ul
        className={`grid gap-1 rounded-[var(--radius-panel)] border border-altair-border/40 bg-altair-paper p-1 shadow-[var(--elev-hairline),var(--elev-2)] lg:grid-cols-1 lg:gap-0.5 lg:p-1.5 ${
          // Six tabs across a phone leave no room for the words, so they sit in
          // two rows of three. Five fit in one row (checked at 360px wide,
          // where "Integrations" is the longest word). There are always five
          // or six: only Numbers comes and goes.
          items.length >= 6 ? "grid-cols-3" : "grid-cols-5"
        }`}
      >
        {items.map((item) => {
          const active = isSettingsItemActive(pathname, item);
          const Icon = item.icon;

          return (
            <li key={item.href} className="min-w-0">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-12 w-full min-w-0 flex-col items-center justify-center gap-1 rounded-[calc(var(--radius-panel)-4px)] px-0.5 py-1.5 text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] lg:min-h-0 lg:flex-row lg:items-start lg:justify-start lg:gap-3 lg:px-3 lg:py-2.5 lg:text-left ${
                  active
                    ? "bg-altair-brass/15 text-altair-ink-on-paper"
                    : "text-altair-ink-on-paper-secondary hover:bg-altair-paper-subtle"
                }`}
              >
                <Icon
                  className={`h-[18px] w-[18px] shrink-0 lg:mt-0.5 ${
                    active ? "text-[var(--brand-metal-text)]" : "text-altair-ink-on-paper-muted"
                  }`}
                  aria-hidden="true"
                />
                <span className="min-w-0">
                  <span className={`block truncate text-[12px] leading-tight lg:text-sm ${active ? "font-bold" : "font-semibold"}`}>
                    {item.label}
                  </span>
                  <span className="hidden text-xs leading-snug text-altair-ink-on-paper-secondary lg:mt-0.5 lg:block">
                    {item.description}
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function SettingsRouteContent({ children }: { children: ReactNode }) {
  return (
    <div
      aria-label="Settings route content"
      className="min-w-0 max-w-full"
      role="region"
    >
      {children}
    </div>
  );
}
