"use client";

import Link from "next/link";
import { Search } from "lucide-react";
import { AltairBrandMark } from "@/shared/components/brand/AltairBrandMark";
import { getCompanyAccessScope } from "@/lib/database/access-control";
import type { ActiveCompanyContext, MembershipWithCompany } from "@/lib/database/types";
import { logoutAction } from "@/app/actions/auth";
import { AlphaIndicator } from "@/shared/components/admin/AlphaIndicator";
import { CompanySwitcher } from "@/shared/components/company/CompanySwitcher";
import { NotificationBell } from "@/shared/components/notifications/NotificationBell";
import { OwnerViewSwitcher } from "@/shared/components/view-mode/OwnerViewSwitcher";
import type { OwnerViewMode } from "@/shared/lib/owner-view-mode";
import { buildNotificationAccess } from "@/shared/types/notification";
import type { Notification } from "@/shared/types/notification";

type HeaderProps = {
  title: string;
  description?: string;
  companyContext: ActiveCompanyContext;
  userCompanies: MembershipWithCompany[];
  notifications?: Notification[];
  unreadNotificationCount?: number;
  showViewSwitcher?: boolean;
  viewMode?: OwnerViewMode;
  onViewModeChange?: (viewMode: OwnerViewMode) => void;
};

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

export function Header({
  title,
  description,
  companyContext,
  userCompanies,
  notifications = [],
  unreadNotificationCount = 0,
  showViewSwitcher = false,
  viewMode = "owner_admin",
  onViewModeChange,
}: HeaderProps) {
  const displayName =
    companyContext.profile.full_name ??
    companyContext.user.email ??
    "User";
  const initials = getInitials(
    companyContext.profile.full_name,
    companyContext.user.email,
  );
  const accessScope = getCompanyAccessScope(companyContext);
  const notificationAccess = buildNotificationAccess({
    canManageCustomers: accessScope.canManageCustomers,
    canViewBilling: accessScope.canViewBilling,
    canViewAllJobs: accessScope.canViewAllJobs,
    canViewCompanyExpenses: accessScope.canViewCompanyExpenses,
    canViewAssignedJobs: companyContext.permissions.viewAssignedJobs,
  });
  const chromeTone = "dark";

  return (
    <header className="admin-premium-header mobile-chrome-header-safe relative z-40 flex w-full max-w-full shrink-0 items-center justify-between gap-2 px-3 sm:gap-2.5 sm:px-5 md:h-[3.75rem] md:min-h-[3.75rem] md:pt-0">
      <div className="flex min-w-0 flex-1 items-center gap-2.5 sm:gap-3">
        <Link
          href="/"
          aria-label="Altair OS home"
          className="shrink-0 rounded-md outline-none transition-opacity hover:opacity-85 focus-visible:ring-2 focus-visible:ring-amber-400/35"
        >
          <AltairBrandMark
            presentation="headerMark"
            className="h-7 w-7 md:hidden"
          />
          <AltairBrandMark
            presentation="headerWordmark"
            className="hidden h-8 w-auto md:block"
          />
        </Link>
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-2">
            <h1 className="truncate text-base font-bold tracking-tight text-stone-50 sm:text-lg">
              {title}
            </h1>
            <AlphaIndicator tone={chromeTone} />
          </div>
          {description ? (
            <p className="hidden truncate text-sm text-stone-400 sm:block">
              {description}
            </p>
          ) : null}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1 sm:gap-3">
        <button
          type="button"
          className="hidden rounded-lg p-2 text-stone-500 transition-colors hover:bg-white/10 hover:text-stone-200 sm:inline-flex"
          aria-label="Search"
        >
          <Search className="h-5 w-5" />
        </button>
        <NotificationBell
          initialNotifications={notifications}
          initialUnreadCount={unreadNotificationCount}
          notificationAccess={notificationAccess}
          tone={chromeTone}
        />
        <div className="flex items-center gap-2 border-l border-white/10 pl-2 sm:ml-2 sm:gap-3 sm:pl-4">
          <CompanySwitcher
            activeCompanyId={companyContext.company.id}
            companies={userCompanies}
            variant="admin"
            tone={chromeTone}
            className={
              userCompanies.length > 1 ? "block" : "hidden md:block"
            }
          />
          {showViewSwitcher && onViewModeChange ? (
            <OwnerViewSwitcher
              viewMode={viewMode}
              onViewModeChange={onViewModeChange}
              tone={chromeTone}
            />
          ) : null}
          <div
            className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-cyan-500 to-cyan-700 text-sm font-bold text-white shadow-sm shadow-cyan-600/30 ring-2 ring-white/20"
            title={displayName}
          >
            {initials}
          </div>
          <form action={logoutAction}>
            <button
              type="submit"
              className="rounded-lg px-2 py-1 text-xs font-semibold text-stone-400 transition-colors hover:bg-white/10 hover:text-white"
            >
              Sign out
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
