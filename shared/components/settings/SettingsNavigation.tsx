"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import {
  Building2,
  CreditCard,
  FileText,
  LayoutDashboard,
  ReceiptText,
  ShieldCheck,
  Users,
  type LucideIcon,
} from "lucide-react";
import { st } from "@/shared/components/settings/north-star-m10/settings-north-star-styles";

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

const SETTINGS_NAVIGATION_GROUPS: readonly SettingsNavigationGroup[] = [
  {
    label: "General",
    items: [
      {
        label: "Overview",
        description: "Settings home and workspace status.",
        href: "/settings",
        exact: true,
        icon: LayoutDashboard,
      },
      {
        label: "Company",
        description: "Business information and branding.",
        href: "/settings/company",
        icon: Building2,
      },
      {
        label: "Team",
        description: "Members, invitations, and permissions.",
        href: "/settings/team",
        icon: Users,
      },
    ],
  },
  {
    label: "Financial",
    items: [
      {
        label: "Documents",
        description: "Invoice and estimate defaults.",
        href: "/settings/documents",
        icon: FileText,
      },
      {
        label: "Subscription",
        description: "Your Altair plan and billing.",
        href: "/settings/subscription",
        icon: ReceiptText,
      },
      {
        label: "Payments",
        description: "Stripe Connect and payment collection.",
        href: "/settings/payments",
        icon: CreditCard,
      },
    ],
  },
  {
    label: "System",
    items: [
      {
        label: "System Check",
        description: "Workspace readiness and diagnostics.",
        href: "/settings/system-check",
        ownerOnly: true,
        icon: ShieldCheck,
      },
    ],
  },
];

type SettingsNavigationProps = {
  northStar: boolean;
  showSystemCheck: boolean;
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

function SettingsNavLinks({
  groups,
  pathname,
  itemClassName,
  activeItemClassName,
  dividerClassName,
  iconActiveClassName,
  iconIdleClassName,
}: {
  groups: readonly SettingsNavigationGroup[];
  pathname: string;
  itemClassName: string;
  activeItemClassName: string;
  dividerClassName: string;
  iconActiveClassName?: string;
  iconIdleClassName?: string;
}) {
  return (
    <>
      {groups.map((group, groupIndex) => (
        <span key={group.label} className="contents">
          {groupIndex > 0 ? (
            <span className={dividerClassName} aria-hidden="true" />
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
                className={`${itemClassName} ${
                  active ? activeItemClassName : ""
                }`}
              >
                <Icon
                  className={`h-4 w-4 shrink-0 ${
                    active
                      ? (iconActiveClassName ?? "")
                      : (iconIdleClassName ?? "")
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

export function SettingsNavigation({
  northStar,
  showSystemCheck,
}: SettingsNavigationProps) {
  const pathname = usePathname();
  const groups = SETTINGS_NAVIGATION_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => !item.ownerOnly || showSystemCheck),
  })).filter((group) => group.items.length > 0);

  if (northStar) {
    return (
      <nav aria-label="Settings categories" className={st.subNavBand}>
        <div className={st.subNavControl}>
          <SettingsNavLinks
            groups={groups}
            pathname={pathname}
            itemClassName={st.subNavItem}
            activeItemClassName={st.subNavItemActive}
            dividerClassName={st.subNavDivider}
          />
        </div>
      </nav>
    );
  }

  return (
    <nav
      aria-label="Settings categories"
      className="border-b border-altair-border pb-3"
    >
      <div className="flex w-full items-stretch gap-0.5 overflow-x-auto overscroll-x-contain rounded-lg border border-altair-border bg-altair-paper-subtle p-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <SettingsNavLinks
          groups={groups}
          pathname={pathname}
          itemClassName="inline-flex min-h-10 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-md px-2.5 py-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-altair-brass focus-visible:ring-offset-2 sm:px-3"
          activeItemClassName="bg-altair-paper-elevated text-altair-ink shadow-sm ring-1 ring-altair-border"
          dividerClassName="mx-0.5 my-1.5 w-px shrink-0 self-stretch bg-altair-border-strong"
          iconActiveClassName="text-altair-brass"
          iconIdleClassName="text-altair-ink-muted"
        />
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
