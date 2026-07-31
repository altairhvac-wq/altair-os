"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef, useState, type ReactNode } from "react";
import {
  Building2,
  ChevronDown,
  CreditCard,
  FileText,
  LayoutDashboard,
  ReceiptText,
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
        label: "Altair Subscription",
        description: "Your Altair plan and billing.",
        href: "/settings/subscription",
        icon: ReceiptText,
      },
      {
        label: "Customer Payments",
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
  variant: "desktop" | "mobile";
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
  northStar,
  showSystemCheck,
  variant,
}: SettingsNavigationProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const mobileTriggerRef = useRef<HTMLButtonElement>(null);
  const groups = SETTINGS_NAVIGATION_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => !item.ownerOnly || showSystemCheck),
  })).filter((group) => group.items.length > 0);
  const items = groups.flatMap((group) => group.items);
  const currentItem = items.find((item) =>
    isSettingsItemActive(pathname, item),
  );

  if (variant === "desktop") {
    return (
      <nav aria-label="Settings navigation">
        <p
          className={`px-3 text-xs font-semibold uppercase tracking-[0.12em] ${
            northStar
              ? "text-[var(--north-star-text-light-muted)]"
              : "text-altair-ink-muted"
          }`}
        >
          Settings
        </p>
        <div className="mt-4 space-y-5">
          {groups.map((group) => (
            <div key={group.label}>
              <p
                className={`px-3 text-[10px] font-semibold uppercase tracking-[0.14em] ${
                  northStar
                    ? "text-[var(--north-star-text-light-muted)]"
                    : "text-altair-ink-muted"
                }`}
              >
                {group.label}
              </p>
              <ul className="mt-1.5 space-y-0.5">
                {group.items.map((item) => {
                  const active = isSettingsItemActive(pathname, item);
                  const Icon = item.icon;

                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        aria-current={active ? "page" : undefined}
                        className={`group flex min-w-0 items-center gap-2.5 rounded-lg px-3 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-altair-brass focus-visible:ring-offset-2 ${
                          active
                            ? "bg-altair-paper-elevated text-altair-ink shadow-sm"
                            : northStar
                              ? "text-[var(--north-star-text-light-muted)] hover:bg-[var(--north-star-panel)] hover:text-[var(--north-star-text-light)]"
                              : "text-altair-ink-secondary hover:bg-altair-paper"
                        }`}
                      >
                        <Icon
                          className={`h-4 w-4 shrink-0 ${
                            active
                              ? "text-altair-brass"
                              : northStar
                                ? "text-[var(--north-star-text-light-muted)] group-hover:text-[var(--north-star-champagne)]"
                                : "text-altair-ink-muted group-hover:text-altair-ink-secondary"
                          }`}
                          aria-hidden="true"
                        />
                        <span className="truncate text-sm font-medium">
                          {item.label}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </nav>
    );
  }

  return (
    <div
      className="relative"
      onKeyDown={(event) => {
        if (event.key === "Escape" && mobileOpen) {
          setMobileOpen(false);
          mobileTriggerRef.current?.focus();
        }
      }}
    >
      <p
        className={`mb-1.5 text-xs font-semibold uppercase tracking-[0.12em] ${
          northStar
            ? "md:text-[var(--north-star-text-light-muted)] text-altair-ink-muted"
            : "text-altair-ink-muted"
        }`}
      >
        Settings category
      </p>
      <button
        ref={mobileTriggerRef}
        type="button"
        aria-controls="settings-mobile-navigation"
        aria-expanded={mobileOpen}
        aria-label="Choose a Settings category"
        onClick={() => setMobileOpen((open) => !open)}
        className="flex min-h-11 w-full items-center justify-between gap-3 rounded-xl border border-altair-border-strong bg-altair-paper-elevated px-3 py-2.5 text-left text-altair-ink-on-paper shadow-sm transition-colors hover:border-altair-brass focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-altair-brass focus-visible:ring-offset-2"
      >
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold">
            {currentItem?.label ?? "Select category"}
          </span>
          {currentItem ? (
            <span className="mt-0.5 block truncate text-xs text-altair-ink-on-paper-muted">
              {currentItem.description}
            </span>
          ) : null}
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-altair-ink-on-paper-muted transition-transform ${
            mobileOpen ? "rotate-180" : ""
          }`}
          aria-hidden="true"
        />
      </button>

      {mobileOpen ? (
        <nav
          id="settings-mobile-navigation"
          aria-label="Settings navigation"
          className="absolute inset-x-0 top-full z-20 mt-2 rounded-xl border border-altair-border-strong bg-altair-paper-elevated p-1.5 shadow-lg"
        >
          <div className="max-h-[min(70vh,32rem)] space-y-3 overflow-y-auto">
            {groups.map((group) => (
              <div key={group.label}>
                <p className="px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-altair-ink-on-paper-muted">
                  {group.label}
                </p>
                <ul className="space-y-0.5">
                  {group.items.map((item) => {
                    const active = isSettingsItemActive(pathname, item);
                    const Icon = item.icon;

                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          aria-current={active ? "page" : undefined}
                          onClick={() => setMobileOpen(false)}
                          className={`flex min-w-0 items-start gap-3 rounded-lg px-3 py-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-altair-brass ${
                            active
                              ? "bg-altair-paper text-altair-ink-on-paper"
                              : "text-altair-ink-on-paper-secondary hover:bg-altair-paper-subtle"
                          }`}
                        >
                          <Icon
                            className={`mt-0.5 h-4 w-4 shrink-0 ${
                              active
                                ? "text-altair-brass"
                                : "text-altair-ink-on-paper-muted"
                            }`}
                            aria-hidden="true"
                          />
                          <span className="min-w-0">
                            <span className="block text-sm font-semibold">
                              {item.label}
                            </span>
                            <span className="mt-0.5 block text-xs leading-5 text-altair-ink-on-paper-muted">
                              {item.description}
                            </span>
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        </nav>
      ) : null}
    </div>
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
