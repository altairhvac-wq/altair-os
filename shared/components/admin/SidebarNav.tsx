"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Check, ChevronDown } from "lucide-react";
import { switchCompanyAction } from "@/app/actions/company-switcher";
import type {
  ActiveCompanyContext,
  MembershipWithCompany,
} from "@/lib/database/types";
import {
  COMPANY_ROLE_LABELS,
  normalizeCompanyRole,
} from "@/lib/database/types/roles";
import { AltairLogo } from "@/shared/components/brand/AltairLogo";
import { ALTAIR_WORDMARK } from "@/shared/components/brand/brand-assets";
import { altairSurfaceCardClass } from "@/shared/design-system/shell/surface-hierarchy";
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
      className={`${northStarSidebarLinkClass} group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-[background-color,color] duration-150 ${
        active
          ? `${northStarSidebarLinkActiveClass} font-semibold`
          : "font-medium"
      }`}
    >
      <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
      <span className="truncate">{item.label}</span>
    </Link>
  );
}

function getInitials(fullName: string | null, email: string | undefined) {
  if (fullName) {
    const parts = fullName.trim().split(/\s+/).filter(Boolean);

    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }

    if (parts.length === 1) {
      return parts[0].slice(0, 2).toUpperCase();
    }
  }

  return (email?.slice(0, 2) ?? "U").toUpperCase();
}

function getRoleLabel(role: string | null | undefined) {
  const normalized = normalizeCompanyRole(role);
  return normalized ? COMPANY_ROLE_LABELS[normalized] : "Member";
}

type SidebarAccountCardProps = {
  companyContext: ActiveCompanyContext;
  userCompanies: MembershipWithCompany[];
};

function SidebarAccountCard({
  companyContext,
  userCompanies,
}: SidebarAccountCardProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const panelRef = useRef<HTMLDivElement>(null);

  const companyName = companyContext.company.name;
  const roleLabel = getRoleLabel(companyContext.role);
  const initials = getInitials(
    companyContext.profile.full_name,
    companyContext.user.email,
  );
  const canSwitch = userCompanies.length > 1;

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!panelRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    if (open) {
      document.addEventListener("mousedown", handlePointerDown);
    }

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, [open]);

  function handleSwitch(companyId: string) {
    if (!canSwitch || companyId === companyContext.company.id || isPending) {
      setOpen(false);
      return;
    }

    setError(null);

    startTransition(async () => {
      const result = await switchCompanyAction(companyId);

      if (result.error) {
        setError(result.error);
        return;
      }

      setOpen(false);
      router.refresh();
    });
  }

  return (
    <div ref={panelRef} className="relative px-3 pb-4 pt-2">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        disabled={isPending}
        aria-expanded={open}
        aria-haspopup={canSwitch ? "listbox" : "menu"}
        aria-label={
          canSwitch
            ? `Account menu for ${companyName}`
            : `Account for ${companyName}`
        }
        className={`admin-north-star-sidebar-account ${altairSurfaceCardClass} flex w-full items-center gap-2.5 px-2.5 py-2 text-left transition-[border-color,background-color] duration-150 disabled:opacity-60`}
      >
        <span
          className="admin-north-star-sidebar-account-avatar flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold"
          aria-hidden="true"
        >
          {initials}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-altair-ink-on-paper">
            {companyName}
          </span>
          <span className="block truncate text-xs text-altair-ink-on-paper-muted">
            {roleLabel}
          </span>
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-altair-ink-on-paper-muted transition-transform duration-150 ${
            open ? "rotate-180" : ""
          }`}
          aria-hidden="true"
        />
      </button>

      {open ? (
        <div
          role={canSwitch ? "listbox" : "menu"}
          aria-label={canSwitch ? "Companies" : "Account"}
          className="north-star-header-dropdown-panel absolute bottom-full left-3 right-3 z-30 mb-1.5 overflow-hidden rounded-lg border border-altair-border bg-altair-paper py-1 shadow-lg"
        >
          {canSwitch
            ? userCompanies.map((membership) => {
                const isActive =
                  membership.company_id === companyContext.company.id;

                return (
                  <button
                    key={membership.company_id}
                    type="button"
                    role="option"
                    aria-selected={isActive}
                    disabled={isPending || isActive}
                    onClick={() => handleSwitch(membership.company_id)}
                    className="flex w-full items-start gap-2 px-3 py-2 text-left transition-colors hover:bg-altair-paper-subtle disabled:cursor-default disabled:opacity-70"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-altair-ink-on-paper">
                        {membership.company.name}
                      </span>
                      <span className="block truncate text-xs text-altair-ink-on-paper-muted">
                        {getRoleLabel(membership.role)}
                      </span>
                    </span>
                    {isActive ? (
                      <Check
                        className="mt-0.5 h-4 w-4 shrink-0 text-altair-brass"
                        aria-hidden="true"
                      />
                    ) : null}
                  </button>
                );
              })
            : (
              <Link
                href="/settings"
                role="menuitem"
                onClick={() => setOpen(false)}
                className="block px-3 py-2 text-sm font-medium text-altair-ink-on-paper transition-colors hover:bg-altair-paper-subtle"
              >
                Settings
              </Link>
            )}
        </div>
      ) : null}

      {error ? (
        <p className="mt-1.5 px-0.5 text-xs text-altair-danger" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

type SidebarNavProps = {
  companyContext: ActiveCompanyContext;
  userCompanies?: MembershipWithCompany[];
  showPlatformAdminNav?: boolean;
};

export function SidebarNav({
  companyContext,
  userCompanies = [],
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
      <div className="admin-north-star-sidebar-brand shrink-0 px-4 pb-3 pt-5">
        <Link
          href="/"
          className="flex items-center gap-2.5 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(201_164_77_/_0.35)]"
          aria-label="Altair home"
        >
          <AltairLogo variant="icon" size="sm" className="shrink-0" />
          <span className="admin-north-star-sidebar-wordmark truncate">
            {ALTAIR_WORDMARK.text}
          </span>
        </Link>
      </div>

      <nav className="flex min-h-0 flex-1 flex-col overflow-y-auto px-3 pb-4 pt-1">
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
          <p className="mt-6 px-2.5 text-xs text-[var(--north-star-sidebar-link)]">
            Limited workspace access
          </p>
        ) : null}
      </nav>

      <SidebarAccountCard
        companyContext={companyContext}
        userCompanies={userCompanies}
      />
    </aside>
  );
}
