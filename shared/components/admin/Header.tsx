"use client";

import { LogOut, Search } from "lucide-react";
import { getCompanyAccessScope } from "@/lib/database/access-control";
import type { ActiveCompanyContext, MembershipWithCompany } from "@/lib/database/types";
import { logoutAction } from "@/app/actions/auth";
import { CompanySwitcher } from "@/shared/components/company/CompanySwitcher";
import { NotificationBell } from "@/shared/components/notifications/NotificationBell";
import { OwnerViewSwitcher } from "@/shared/components/view-mode/OwnerViewSwitcher";
import { useMobileViewport } from "@/shared/components/mobile/use-mobile-viewport";
import type { OwnerViewMode } from "@/shared/lib/owner-view-mode";
import { buildNotificationAccess } from "@/shared/types/notification";
import type { Notification } from "@/shared/types/notification";
import { isNorthStarShellEnabled } from "@/lib/beta/north-star-shell";

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
  const isMobile = useMobileViewport();
  const northStarChrome = isNorthStarShellEnabled() && !isMobile;
  const chromeTone = isMobile ? "light" : "dark";

  return (
    <header className="admin-premium-header mobile-chrome-header-safe relative z-40 flex w-full max-w-full shrink-0 items-center justify-between gap-2 border-b border-slate-200/90 bg-white px-3 shadow-[0_1px_3px_rgb(15_23_42_/_0.04)] sm:gap-2.5 sm:px-5 md:h-[3.75rem] md:min-h-[3.75rem] md:pt-0">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <div className="min-w-0 md:hidden">
          <div className="flex min-w-0 items-center gap-2">
            <p
              className={`truncate text-base font-bold tracking-tight sm:text-lg ${
                northStarChrome ? "" : "text-slate-900 md:text-slate-50"
              }`}
            >
              {title}
            </p>
          </div>
          {description ? (
            <p
              className={`hidden truncate text-sm sm:block ${
                northStarChrome ? "" : "text-slate-500 md:text-slate-400"
              }`}
            >
              {description}
            </p>
          ) : null}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1 sm:gap-3">
        <button
          type="button"
          className={`hidden rounded-lg p-2 transition-colors sm:inline-flex ${
            northStarChrome
              ? "north-star-header-search"
              : "text-slate-400 hover:bg-slate-100 hover:text-slate-600 md:text-slate-400 md:hover:bg-white/10 md:hover:text-slate-200"
          }`}
          aria-label="Search"
        >
          <Search className="h-5 w-5" />
        </button>
        <NotificationBell
          initialNotifications={notifications}
          initialUnreadCount={unreadNotificationCount}
          notificationAccess={notificationAccess}
          tone={chromeTone}
          triggerClassName={
            northStarChrome ? "north-star-header-bell" : undefined
          }
          badgeClassName={
            northStarChrome ? "north-star-header-bell-badge" : undefined
          }
        />
        <div
          className={`flex items-center gap-2 pl-2 sm:ml-2 sm:gap-3 sm:pl-4 ${
            northStarChrome
              ? "north-star-header-divider border-l"
              : "border-l border-slate-200 md:border-white/10"
          }`}
        >
          <CompanySwitcher
            activeCompanyId={companyContext.company.id}
            companies={userCompanies}
            variant="admin"
            tone={chromeTone}
            className={`${
              userCompanies.length > 1 ? "block" : "hidden md:block"
            } ${northStarChrome ? "north-star-company-switcher" : ""}`}
          />
          {showViewSwitcher && onViewModeChange ? (
            <OwnerViewSwitcher
              viewMode={viewMode}
              onViewModeChange={onViewModeChange}
              tone={chromeTone}
              className={northStarChrome ? "north-star-view-switcher" : ""}
            />
          ) : null}
          <div
            className={
              northStarChrome
                ? "north-star-header-avatar flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold ring-2"
                : "hidden h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-cyan-500 to-cyan-700 text-sm font-bold text-white shadow-sm shadow-cyan-600/30 ring-2 ring-white sm:flex md:ring-white/25"
            }
            title={displayName}
          >
            {initials}
          </div>
          <form action={logoutAction}>
            <button
              type="submit"
              aria-label="Sign out"
              className={`inline-flex h-9 w-9 items-center justify-center rounded-lg text-xs font-semibold transition-colors sm:h-auto sm:w-auto sm:px-2 sm:py-1 ${
                northStarChrome
                  ? "north-star-header-signout"
                  : "text-slate-500 hover:bg-slate-100 hover:text-slate-700 md:text-slate-300 md:hover:bg-white/10 md:hover:text-white"
              }`}
            >
              <LogOut className="h-4 w-4 sm:hidden" aria-hidden="true" />
              <span className="hidden sm:inline">Sign out</span>
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
