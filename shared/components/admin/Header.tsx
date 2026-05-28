"use client";

import { Search } from "lucide-react";
import type { ActiveCompanyContext, MembershipWithCompany } from "@/lib/database/types";
import { logoutAction } from "@/app/actions/auth";
import { AlphaIndicator } from "@/shared/components/admin/AlphaIndicator";
import { CompanySwitcher } from "@/shared/components/company/CompanySwitcher";
import { NotificationBell } from "@/shared/components/notifications/NotificationBell";
import { OwnerViewSwitcher } from "@/shared/components/view-mode/OwnerViewSwitcher";
import type { OwnerViewMode } from "@/shared/lib/owner-view-mode";
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

  return (
    <header className="relative z-40 flex min-h-[calc(4.25rem+env(safe-area-inset-top,0px))] w-full max-w-full shrink-0 items-center justify-between gap-2 border-b border-slate-200/80 bg-white/90 px-4 pt-[env(safe-area-inset-top,0px)] shadow-[0_1px_0_rgba(15,23,42,0.04)] backdrop-blur-md sm:gap-3 sm:px-6 md:h-[4.25rem] md:min-h-[4.25rem] md:pt-0">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-2">
            <h1 className="truncate text-base font-bold tracking-tight text-slate-900 sm:text-lg">
              {title}
            </h1>
            <AlphaIndicator />
          </div>
          {description ? (
            <p className="hidden truncate text-sm text-slate-500 sm:block">
              {description}
            </p>
          ) : null}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1 sm:gap-3">
        <button
          type="button"
          className="hidden rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 sm:inline-flex"
          aria-label="Search"
        >
          <Search className="h-5 w-5" />
        </button>
        <NotificationBell
          initialNotifications={notifications}
          initialUnreadCount={unreadNotificationCount}
        />
        <div className="flex items-center gap-2 border-l border-slate-200 pl-2 sm:ml-2 sm:gap-3 sm:pl-4">
          <CompanySwitcher
            activeCompanyId={companyContext.company.id}
            companies={userCompanies}
            variant="admin"
            className={
              userCompanies.length > 1 ? "block" : "hidden md:block"
            }
          />
          {showViewSwitcher && onViewModeChange ? (
            <OwnerViewSwitcher
              viewMode={viewMode}
              onViewModeChange={onViewModeChange}
            />
          ) : null}
          <div
            className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-cyan-500 to-cyan-700 text-sm font-bold text-white shadow-sm shadow-cyan-600/30 ring-2 ring-white"
            title={displayName}
          >
            {initials}
          </div>
          <form action={logoutAction}>
            <button
              type="submit"
              className="rounded-lg px-2 py-1 text-xs font-semibold text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
            >
              Sign out
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
