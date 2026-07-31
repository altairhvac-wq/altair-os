"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef, useState, type ReactNode } from "react";
import {
  ChevronDown,
  LayoutDashboard,
  ShieldCheck,
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

const SETTINGS_NAVIGATION_ITEMS: readonly SettingsNavigationItem[] = [
  {
    label: "Overview",
    description:
      "Company setup, team, billing, payments, and workspace configuration.",
    href: "/settings",
    exact: true,
    icon: LayoutDashboard,
  },
  {
    label: "System Check",
    description: "Review workspace readiness and production diagnostics.",
    href: "/settings/system-check",
    ownerOnly: true,
    icon: ShieldCheck,
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
  const items = SETTINGS_NAVIGATION_ITEMS.filter(
    (item) => !item.ownerOnly || showSystemCheck,
  );
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
          Categories
        </p>
        <ul className="mt-2 space-y-1">
          {items.map((item) => {
            const active = isSettingsItemActive(pathname, item);
            const Icon = item.icon;

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`group flex min-w-0 items-start gap-3 rounded-xl border px-3 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-altair-brass focus-visible:ring-offset-2 ${
                    active
                      ? "border-altair-border-strong bg-altair-paper-elevated text-altair-ink shadow-sm"
                      : northStar
                        ? "border-transparent text-[var(--north-star-text-light-muted)] hover:border-[var(--north-star-border)] hover:bg-[var(--north-star-panel)] hover:text-[var(--north-star-text-light)]"
                        : "border-transparent text-altair-ink-secondary hover:border-altair-border hover:bg-altair-paper"
                  }`}
                >
                  <Icon
                    className={`mt-0.5 h-4 w-4 shrink-0 ${
                      active
                        ? "text-altair-brass"
                        : northStar
                          ? "text-[var(--north-star-text-light-muted)] group-hover:text-[var(--north-star-champagne)]"
                          : "text-altair-ink-muted group-hover:text-altair-ink-secondary"
                    }`}
                    aria-hidden="true"
                  />
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold">
                      {item.label}
                    </span>
                    <span
                      className={`mt-1 block text-xs leading-5 ${
                        active
                          ? "text-altair-ink-on-paper-muted"
                          : northStar
                            ? "text-[var(--north-star-text-light-muted)]"
                            : "text-altair-ink-muted"
                      }`}
                    >
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
          <ul className="space-y-1">
            {items.map((item) => {
              const active = isSettingsItemActive(pathname, item);
              const Icon = item.icon;

              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    onClick={() => setMobileOpen(false)}
                    className={`flex min-w-0 items-start gap-3 rounded-lg border px-3 py-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-altair-brass ${
                      active
                        ? "border-altair-border-strong bg-altair-paper text-altair-ink-on-paper"
                        : "border-transparent text-altair-ink-on-paper-secondary hover:bg-altair-paper-subtle"
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
        </nav>
      ) : null}
    </div>
  );
}

export function SettingsRouteContent({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const hideOverviewHeader = pathname === "/settings";

  return (
    <div
      aria-label="Settings route content"
      className={`min-w-0 max-w-full ${
        hideOverviewHeader
          ? "[&_.admin-page-header]:hidden [&_.north-star-settings-page-header]:hidden"
          : ""
      }`}
      role="region"
    >
      {children}
    </div>
  );
}
