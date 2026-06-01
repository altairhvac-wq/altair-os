"use client";

import { Search } from "lucide-react";
import { getCompanyAccessScope } from "@/lib/database/access-control";
import type { ActiveCompanyContext, MembershipWithCompany } from "@/lib/database/types";
import { logoutAction } from "@/app/actions/auth";
import { AlphaIndicator } from "@/shared/components/admin/AlphaIndicator";
import { CompanySwitcher } from "@/shared/components/company/CompanySwitcher";
import { NotificationBell } from "@/shared/components/notifications/NotificationBell";
import { OwnerViewSwitcher } from "@/shared/components/view-mode/OwnerViewSwitcher";
import { useMobileViewport } from "@/shared/components/mobile/use-mobile-viewport";
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
  const isMobile = useMobileViewport();
  const chromeTone = isMobile ? "light" : "dark";

  return (
    <header className="admin-premium-header relative z-40 flex min-h-[calc(3.75rem+env(safe-area-inset-top,0px))] w-full max-w-full shrink-0 items-center justify-between gap-2 border-b border-slate-200/90 bg-white px-3 pt-[env(safe-area-inset-top,0px)] shadow-[0_1px_3px_rgb(15_23_42_/_0.04)] sm:gap-2.5 sm:px-5 md:h-[3.75rem] md:min-h-[3.75rem] md:pt-0">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-2">
            <h1 className="truncate text-base font-bold tracking-tight text-slate-900 sm:text-lg md:text-slate-50">
              {title}
            </h1>
            <AlphaIndicator tone={chromeTone} />
          </div>
          {description ? (
            <p className="hidden truncate text-sm text-slate-500 sm:block md:text-slate-400">
              {description}
            </p>
          ) : null}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1 sm:gap-3">
        <button
          type="button"
          className="hidden rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 sm:inline-flex md:text-slate-400 md:hover:bg-white/10 md:hover:text-slate-200"
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
        <div className="flex items-center gap-2 border-l border-slate-200 pl-2 sm:ml-2 sm:gap-3 sm:pl-4 md:border-white/10">
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
            className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-cyan-500 to-cyan-700 text-sm font-bold text-white shadow-sm shadow-cyan-600/30 ring-2 ring-white md:ring-white/25"
            title={displayName}
          >
            {initials}
          </div>
          <form action={logoutAction}>
            <button
              type="submit"
              className="rounded-lg px-2 py-1 text-xs font-semibold text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 md:text-slate-300 md:hover:bg-white/10 md:hover:text-white"
            >
              Sign out
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
