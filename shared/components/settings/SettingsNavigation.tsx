"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import {
  Bell,
  Building2,
  CreditCard,
  FileText,
  LayoutDashboard,
  Link2,
  Settings2,
  ShieldCheck,
  Users,
  type LucideIcon,
} from "lucide-react";

type SettingsNavigationItem = {
  label: string;
  description: string;
  href: string;
  exact?: boolean;
  ownerOnly?: boolean;
  icon: LucideIcon;
};

type SettingsNavigationGroup = {
  label: string;
  items: readonly SettingsNavigationItem[];
};

/** Reference-sheet primary tabs, in locked order. */
const SETTINGS_PRIMARY_GROUP: SettingsNavigationGroup = {
  label: "Settings",
  items: [
    {
      label: "Company",
      description: "Business identity, contact details, and address.",
      href: "/settings/company",
      icon: Building2,
    },
    {
      label: "Billing",
      description: "Altair plan and customer payment collection.",
      href: "/settings/subscription",
      icon: CreditCard,
    },
    {
      label: "Users",
      description: "Members, invitations, roles, and reporting lines.",
      href: "/settings/team",
      icon: Users,
    },
    {
      label: "Integrations",
      description: "Stripe and social account connections.",
      href: "/settings/integrations",
      icon: Link2,
    },
    {
      label: "Notifications",
      description: "In-app notification inbox preview.",
      href: "/settings/notifications",
      icon: Bell,
    },
    {
      label: "Preferences",
      description: "Company timezone and workspace preferences.",
      href: "/settings/preferences",
      icon: Settings2,
    },
  ],
};

/** Kept accessible outside the reference sheet's 6 tabs. */
const SETTINGS_MORE_GROUP: SettingsNavigationGroup = {
  label: "More",
  items: [
    {
      label: "Overview",
      description: "Settings home and workspace status.",
      href: "/settings",
      exact: true,
      icon: LayoutDashboard,
    },
    {
      label: "Documents",
      description: "Tax, terms, and estimate/invoice defaults.",
      href: "/settings/documents",
      icon: FileText,
    },
    {
      label: "System Check",
      description: "Workspace readiness and diagnostics.",
      href: "/settings/system-check",
      ownerOnly: true,
      icon: ShieldCheck,
    },
  ],
};

const SETTINGS_NAVIGATION_GROUPS: readonly SettingsNavigationGroup[] = [
  SETTINGS_PRIMARY_GROUP,
  SETTINGS_MORE_GROUP,
];

type SettingsNavigationProps = {
  showSystemCheck: boolean;
};

function isSettingsItemActive(
  pathname: string,
  item: SettingsNavigationItem,
): boolean {
  if (item.exact) {
    return pathname === item.href;
  }

  // Billing tab owns both subscription and nested payments routes.
  if (item.href === "/settings/subscription") {
    return (
      pathname === "/settings/subscription" ||
      pathname.startsWith("/settings/subscription/") ||
      pathname === "/settings/payments" ||
      pathname.startsWith("/settings/payments/")
    );
  }

  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

function SettingsNavLinks({
  groups,
  pathname,
}: {
  groups: readonly SettingsNavigationGroup[];
  pathname: string;
}) {
  return (
    <>
      {groups.map((group, groupIndex) => (
        <span key={group.label} className="contents">
          {groupIndex > 0 ? (
            <span
              className="mx-0.5 my-1.5 w-px shrink-0 self-stretch bg-altair-border-strong"
              aria-hidden="true"
            />
          ) : null}
          {group.items.map((item) => {
            const active = isSettingsItemActive(pathname, item);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                title={item.description}
                aria-current={active ? "page" : undefined}
                className={`inline-flex min-h-10 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-md px-2.5 py-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-altair-brass focus-visible:ring-offset-2 sm:px-3 ${
                  active
                    ? "bg-[var(--surface-card)] text-altair-ink shadow-sm ring-1 ring-altair-border"
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
        </span>
      ))}
    </>
  );
}

export function SettingsNavigation({ showSystemCheck }: SettingsNavigationProps) {
  const pathname = usePathname();
  const groups = SETTINGS_NAVIGATION_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => !item.ownerOnly || showSystemCheck),
  })).filter((group) => group.items.length > 0);

  return (
    <nav
      aria-label="Settings categories"
      className="border-b border-altair-border pb-3"
    >
      <div className="flex w-full items-stretch gap-0.5 overflow-x-auto overscroll-x-contain rounded-lg border border-altair-border bg-[var(--surface-section)] p-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <SettingsNavLinks groups={groups} pathname={pathname} />
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
