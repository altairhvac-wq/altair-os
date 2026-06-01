"use client";

import { usePathname } from "next/navigation";
import type { ActiveCompanyContext, MembershipWithCompany } from "@/lib/database/types";
import { CompanyTimezoneProvider } from "@/shared/lib/company-timezone";
import { PullToRefresh } from "@/shared/components/mobile/PullToRefresh";
import { isPullToRefreshRoute } from "@/shared/components/mobile/is-pull-to-refresh-route";
import { useMobileViewport } from "@/shared/components/mobile/use-mobile-viewport";
import { useOwnerViewMode } from "@/shared/components/view-mode/useOwnerViewMode";
import { getNavItemForPath } from "./nav-items";
import { AdminNavSkeleton } from "./AdminNavSkeleton";
import { DesktopNav } from "./DesktopNav";
import { MobileNav } from "./MobileNav";
import { Header } from "./Header";
import { shouldHideAdminNavigation } from "./should-hide-admin-navigation";
import type { Notification } from "@/shared/types/notification";
import { BetaBugReportButton } from "@/shared/components/beta-feedback/BetaBugReportButton";
import { isBetaBugReportEnabled } from "@/lib/beta/beta-bug-report";

type AdminShellProps = {
  children: React.ReactNode;
  companyContext: ActiveCompanyContext;
  userCompanies: MembershipWithCompany[];
  notifications?: Notification[];
  unreadNotificationCount?: number;
  showPlatformAdminNav?: boolean;
};

export function AdminShell({
  children,
  companyContext,
  userCompanies,
  notifications = [],
  unreadNotificationCount = 0,
  showPlatformAdminNav = false,
}: AdminShellProps) {
  const pathname = usePathname();
  const isMobile = useMobileViewport();
  const { isOwner, viewMode, setViewMode, navigationContext } =
    useOwnerViewMode(companyContext);
  const hideAdminNavigation = shouldHideAdminNavigation(
    pathname,
    companyContext,
    viewMode,
  );
  const pullToRefreshEnabled =
    isMobile && isPullToRefreshRoute(pathname);
  const current = getNavItemForPath(pathname, navigationContext, {
    includePlatformAdmin: showPlatformAdminNav,
  });

  return (
    <CompanyTimezoneProvider timeZone={companyContext.company.timezone}>
      <div className="admin-canvas flex min-h-dvh w-full min-w-0 max-w-full flex-col md:h-dvh md:overflow-hidden">
      <div className="admin-top-shell no-print">
        <Header
          title={current.label}
          description={current.description}
          companyContext={companyContext}
          userCompanies={userCompanies}
          notifications={notifications}
          unreadNotificationCount={unreadNotificationCount}
          showViewSwitcher={isOwner}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
        />
        {hideAdminNavigation ? (
          <AdminNavSkeleton variant="desktop" />
        ) : (
          <DesktopNav
            companyContext={navigationContext}
            showPlatformAdminNav={showPlatformAdminNav}
          />
        )}
      </div>

      <div className="no-print md:hidden">
        {hideAdminNavigation ? (
          <AdminNavSkeleton variant="mobile" />
        ) : (
          <MobileNav
            companyContext={navigationContext}
            showPlatformAdminNav={showPlatformAdminNav}
          />
        )}
      </div>

      <main className="min-h-0 min-w-0 max-w-full flex-1 overflow-x-clip p-2.5 sm:p-4 lg:p-5 md:overflow-y-auto">
        <PullToRefresh enabled={pullToRefreshEnabled}>
          {children}
        </PullToRefresh>
      </main>
      </div>
      {isBetaBugReportEnabled() ? <BetaBugReportButton /> : null}
    </CompanyTimezoneProvider>
  );
}
