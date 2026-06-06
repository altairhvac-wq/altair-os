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
import { AdminShellContentLoadingState } from "./AdminShellContentLoadingState";
import { DesktopNav } from "./DesktopNav";
import { MobileNav } from "./MobileNav";
import { Header } from "./Header";
import { shouldHideAdminNavigation } from "./should-hide-admin-navigation";
import type { Notification } from "@/shared/types/notification";
import { BetaBugReportButton } from "@/shared/components/beta-feedback/BetaBugReportButton";
import { FounderMarketingDisplayProvider } from "@/shared/components/display/FounderMarketingDisplayContext";
import { isBetaBugReportEnabled } from "@/lib/beta/beta-bug-report";

type AdminShellProps = {
  children: React.ReactNode;
  companyContext: ActiveCompanyContext;
  userCompanies: MembershipWithCompany[];
  notifications?: Notification[];
  unreadNotificationCount?: number;
  showPlatformAdminNav?: boolean;
  hideDemoPrefixes?: boolean;
};

export function AdminShell({
  children,
  companyContext,
  userCompanies,
  notifications = [],
  unreadNotificationCount = 0,
  showPlatformAdminNav = false,
  hideDemoPrefixes = false,
}: AdminShellProps) {
  const pathname = usePathname();
  const isMobile = useMobileViewport();
  const { isOwner, viewMode, setViewMode, navigationContext, redirectPending } =
    useOwnerViewMode(companyContext);
  const hideAdminNavigation = shouldHideAdminNavigation(
    pathname,
    companyContext,
    viewMode,
  );
  const pullToRefreshEnabled =
    isMobile && isPullToRefreshRoute(pathname);
  const isMobileDashboard = isMobile && pathname === "/";
  const current = getNavItemForPath(pathname, navigationContext, {
    includePlatformAdmin: showPlatformAdminNav,
  });

  return (
    <FounderMarketingDisplayProvider hideDemoPrefixes={hideDemoPrefixes}>
    <CompanyTimezoneProvider timeZone={companyContext.company.timezone}>
      <div className="admin-canvas admin-shell-canvas flex w-full min-w-0 max-w-full flex-col md:min-h-dvh md:h-dvh md:overflow-hidden">
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

      <main className="admin-shell-main min-h-0 min-w-0 max-w-full overflow-x-clip px-2.5 pt-2.5 sm:px-4 sm:pt-4 lg:p-5 md:overflow-y-auto">
        <PullToRefresh enabled={pullToRefreshEnabled}>
          {redirectPending ? <AdminShellContentLoadingState /> : children}
        </PullToRefresh>
      </main>
      </div>
      {isBetaBugReportEnabled() &&
      !(isMobile && pathname.startsWith("/settings")) &&
      !isMobileDashboard ? (
        <BetaBugReportButton />
      ) : null}
    </CompanyTimezoneProvider>
    </FounderMarketingDisplayProvider>
  );
}
