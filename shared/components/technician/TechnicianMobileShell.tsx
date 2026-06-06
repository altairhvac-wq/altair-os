"use client";

import { LogOut } from "lucide-react";
import { AltairLogo } from "@/shared/components/brand/AltairLogo";
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
import { TechnicianShellContentLoadingState } from "./TechnicianShellContentLoadingState";
import { BetaBugReportButton } from "@/shared/components/beta-feedback/BetaBugReportButton";
import { FounderMarketingDisplayProvider } from "@/shared/components/display/FounderMarketingDisplayContext";
import { isBetaBugReportEnabled } from "@/lib/beta/beta-bug-report";

type TechnicianMobileShellProps = {
  children: React.ReactNode;
  companyContext: ActiveCompanyContext;
  userCompanies: MembershipWithCompany[];
  unreadNotificationCount?: number;
  hideDemoPrefixes?: boolean;
};

export function TechnicianMobileShell({
  children,
  companyContext,
  userCompanies,
  unreadNotificationCount = 0,
  hideDemoPrefixes = false,
}: TechnicianMobileShellProps) {
  const { isOwner, viewMode, setViewMode, navigationContext, redirectPending } =
    useOwnerViewMode(companyContext);

  return (
    <FounderMarketingDisplayProvider hideDemoPrefixes={hideDemoPrefixes}>
    <CompanyTimezoneProvider timeZone={companyContext.company.timezone}>
      <TechnicianNotificationBadgeProvider
        initialUnreadCount={unreadNotificationCount}
      >
      <div className="tech-canvas min-h-dvh max-w-full overflow-x-clip">
        <div className="tech-shell mx-auto flex min-h-dvh min-w-0 flex-col">
          <header className="tech-header tech-header-safe sticky top-0 z-30 px-4 pb-2.5 pt-0.5">
            <div className="flex min-w-0 items-center gap-2.5">
              <AltairLogo variant="gold" size="sm" showWordmark={false} />
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

          <main className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto px-4 py-4 pb-[max(6rem,calc(5.5rem+env(safe-area-inset-bottom,0px)))] sm:px-5 sm:py-5">
            <PullToRefresh>
              {redirectPending ? (
                <TechnicianShellContentLoadingState />
              ) : (
                children
              )}
            </PullToRefresh>
          </main>

          <TechnicianBottomNav companyContext={navigationContext} />
          {isBetaBugReportEnabled() ? (
            <BetaBugReportButton aboveMobileBottomNav />
          ) : null}
        </div>
      </div>
    </TechnicianNotificationBadgeProvider>
    </CompanyTimezoneProvider>
    </FounderMarketingDisplayProvider>
  );
}
