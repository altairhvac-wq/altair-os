"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import {
  Building2,
  CreditCard,
  LayoutDashboard,
  Plug,
  Users,
  type LucideIcon,
} from "lucide-react";

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
 * Integrations was merged into Company too, and has been un-merged. That was
 * the right call while the only integration was Facebook and its entire state
 * was "connected or not". It stops being right with nine providers across
 * three kinds, each carrying configuration, connection health, granted scopes
 * and a provider-side capability no token reflects — Company's Connections
 * rows cannot express that without becoming this page. Company keeps a
 * summary and links here, so there is still one home for the detail.
 */
const SETTINGS_NAVIGATION_ITEMS: readonly SettingsNavigationItem[] = [
  {
    label: "Overview",
    description: "Health, readiness, and setup checklist.",
    href: "/settings",
    exact: true,
    icon: LayoutDashboard,
  },
  {
    label: "Company",
    description: "Profile, document defaults, timezone, and connections.",
    href: "/settings/company",
    icon: Building2,
  },
  {
    label: "Billing",
    description: "Altair plan and customer payment collection.",
    href: "/settings/billing",
    icon: CreditCard,
  },
  {
    label: "Integrations",
    description: "Publishing channels, creative sources, and their status.",
    href: "/settings/integrations",
    icon: Plug,
  },
  {
    label: "Users",
    description: "Company tree, roles, and invitations.",
    href: "/settings/users",
    icon: Users,
  },
];

type SettingsNavigationProps = {
  /** Kept for call-site compatibility; System Check now lives on Overview. */
  showSystemCheck?: boolean;
  /**
   * Integrations lists the founder's marketing channels (Facebook, TikTok,
   * Higgsfield...) with developer variable names. A customer company cannot
   * use any of them (Marketing Hub is platform-admin only), so the tab is
   * shown to platform admins only.
   */
  showIntegrations?: boolean;
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
  showIntegrations = false,
}: SettingsNavigationProps) {
  const pathname = usePathname();
  const items = showIntegrations
    ? SETTINGS_NAVIGATION_ITEMS
    : SETTINGS_NAVIGATION_ITEMS.filter(
        (item) => item.href !== "/settings/integrations",
      );

  return (
    <nav aria-label="Settings categories">
      <div className="flex w-full items-stretch gap-0.5 overflow-x-auto overscroll-x-contain rounded-none border border-[var(--north-star-border)] bg-[var(--surface-section)] p-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {items.map((item) => {
          const active = isSettingsItemActive(pathname, item);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              title={item.description}
              aria-current={active ? "page" : undefined}
              className={`inline-flex min-h-10 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-none px-2.5 py-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-altair-brass focus-visible:ring-offset-2 sm:px-3 ${
                active
                  ? "bg-[var(--surface-card)] text-altair-ink shadow-sm ring-1 ring-[var(--north-star-border)]"
                  : "text-altair-ink-secondary hover:bg-[var(--surface-tile)] hover:text-altair-ink"
              }`}
            >
              <Icon
                className={`h-4 w-4 shrink-0 ${
                  active ? "text-altair-brass" : "text-altair-ink-muted"
                }`}
                aria-hidden="true"
              />
              {item.label}
            </Link>
          );
        })}
      </div>
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
