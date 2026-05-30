"use client";

import { LogOut, Wrench } from "lucide-react";
import type { ActiveCompanyContext, MembershipWithCompany } from "@/lib/database/types";
import { logoutAction } from "@/app/actions/auth";
import { CompanyTimezoneProvider } from "@/shared/lib/company-timezone";
import { CompanySwitcher } from "@/shared/components/company/CompanySwitcher";
import { PullToRefresh } from "@/shared/components/mobile/PullToRefresh";
import { TechnicianNotificationBadgeProvider } from "@/shared/components/notifications/TechnicianNotificationBadgeContext";
import { TechnicianNotificationLink } from "@/shared/components/notifications/TechnicianNotificationLink";
import { OwnerViewSwitcher } from "@/shared/components/view-mode/OwnerViewSwitcher";
import { useOwnerViewMode } from "@/shared/components/view-mode/useOwnerViewMode";
import { TechnicianBottomNav } from "./TechnicianBottomNav";

type TechnicianMobileShellProps = {
  children: React.ReactNode;
  companyContext: ActiveCompanyContext;
  userCompanies: MembershipWithCompany[];
  unreadNotificationCount?: number;
};

export function TechnicianMobileShell({
  children,
  companyContext,
  userCompanies,
  unreadNotificationCount = 0,
}: TechnicianMobileShellProps) {
  const { isOwner, viewMode, setViewMode, navigationContext } =
    useOwnerViewMode(companyContext);

  return (
    <CompanyTimezoneProvider timeZone={companyContext.company.timezone}>
      <TechnicianNotificationBadgeProvider
        initialUnreadCount={unreadNotificationCount}
      >
      <div className="tech-canvas min-h-dvh max-w-full overflow-x-clip">
        <div className="tech-shell mx-auto flex min-h-dvh w-full min-w-0 max-w-md flex-col border-x">
          <header className="tech-header sticky top-0 z-30 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
            <div className="flex min-w-0 items-center gap-2.5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200/90 bg-white text-slate-700 shadow-sm ring-1 ring-slate-200/60">
                <Wrench className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-900">Altair OS</p>
                <CompanySwitcher
                  activeCompanyId={companyContext.company.id}
                  companies={userCompanies}
                  variant="technician"
                />
              </div>
              {isOwner ? (
                <OwnerViewSwitcher
                  viewMode={viewMode}
                  onViewModeChange={setViewMode}
                />
              ) : null}
              <TechnicianNotificationLink />
              <form action={logoutAction}>
                <button
                  type="submit"
                  aria-label="Sign out"
                  title="Sign out"
                  className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </form>
            </div>
          </header>

          <main className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto px-3 py-3 pb-[max(5.75rem,calc(5.25rem+env(safe-area-inset-bottom,0px)))] sm:px-4 sm:py-4">
            <PullToRefresh>{children}</PullToRefresh>
          </main>

          <TechnicianBottomNav companyContext={navigationContext} />
        </div>
      </div>
    </TechnicianNotificationBadgeProvider>
    </CompanyTimezoneProvider>
  );
}
