"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import type { ActiveCompanyContext, MembershipWithCompany } from "@/lib/database/types";
import type { CompanyBillingAccess } from "@/lib/saas-billing/types";
import { CompanyTimezoneProvider } from "@/shared/lib/company-timezone";
import { PullToRefresh } from "@/shared/components/mobile/PullToRefresh";
import { isPullToRefreshRoute } from "@/shared/components/mobile/is-pull-to-refresh-route";
import { useMobileViewport } from "@/shared/components/mobile/use-mobile-viewport";
import { useOwnerViewMode } from "@/shared/components/view-mode/useOwnerViewMode";
import { getNavItemForPath } from "./nav-items";
import { AdminNavSkeleton } from "./AdminNavSkeleton";
import { AdminShellContentLoadingState } from "./AdminShellContentLoadingState";
import { AdminQuickNavDrawer } from "./AdminQuickNavDrawer";
import { MobileNav } from "./MobileNav";
import { Header } from "./Header";
import { shouldHideAdminNavigation } from "./should-hide-admin-navigation";
import type { Notification } from "@/shared/types/notification";
import { BetaBugReportButton } from "@/shared/components/beta-feedback/BetaBugReportButton";
import { FounderMarketingDisplayProvider } from "@/shared/components/display/FounderMarketingDisplayContext";
import { isBetaBugReportEnabled } from "@/lib/beta/beta-bug-report";
import { PwaInstallBanner } from "@/shared/components/pwa/PwaInstallBanner";
import { SidebarNav } from "./SidebarNav";
import { buildDesignLabShineLiveCss } from "@/shared/components/platform-admin/design-lab/design-lab-live-vars";

type AdminShellProps = {
  children: React.ReactNode;
  companyContext: ActiveCompanyContext;
  userCompanies: MembershipWithCompany[];
  notifications?: Notification[];
  unreadNotificationCount?: number;
  showPlatformAdminNav?: boolean;
  hideDemoPrefixes?: boolean;
  billingAccess?: CompanyBillingAccess | null;
  /**
   * Optional Design Lab Stage 3 live token overrides. Applied as inline CSS
   * custom properties on `.admin-north-star-shell` during SSR so the first
   * paint matches the promoted theme (no default-then-override flash).
   * May include `--token--shine` companion gradients.
   */
  liveThemeStyle?: React.CSSProperties | null;
};

export function AdminShell({
  children,
  companyContext,
  userCompanies,
  notifications = [],
  unreadNotificationCount = 0,
  showPlatformAdminNav = false,
  hideDemoPrefixes = false,
  billingAccess = null,
  liveThemeStyle = null,
}: AdminShellProps) {
  const pathname = usePathname();
  const isMobile = useMobileViewport();
  const [quickNavOpen, setQuickNavOpen] = useState(false);
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
  const showMobileDestinationNav = !hideAdminNavigation;
  const current = getNavItemForPath(pathname, navigationContext, {
    includePlatformAdmin: showPlatformAdminNav,
  });

  useEffect(() => {
    setQuickNavOpen(false);
  }, [pathname]);

  const hasLiveTheme = Boolean(liveThemeStyle);

  return (
    <FounderMarketingDisplayProvider hideDemoPrefixes={hideDemoPrefixes}>
    <CompanyTimezoneProvider timeZone={companyContext.company.timezone}>
      {hasLiveTheme ? (
        <style
          // Shine companions need selector rules (background-image on chrome
          // planes). Inline CSS vars alone cannot retarget `background:` shorthand.
          dangerouslySetInnerHTML={{ __html: buildDesignLabShineLiveCss() }}
        />
      ) : null}
      <div
        className="admin-canvas admin-shell-canvas admin-north-star-shell flex w-full min-w-0 max-w-full flex-col md:min-h-dvh md:h-dvh md:overflow-hidden md:flex-row"
        style={liveThemeStyle ?? undefined}
        data-design-lab-live={hasLiveTheme ? "true" : undefined}
      >
      {hideAdminNavigation ? (
        <AdminNavSkeleton variant="desktop-sidebar" />
      ) : (
        <SidebarNav
          companyContext={navigationContext}
          showPlatformAdminNav={showPlatformAdminNav}
        />
      )}

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
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
          showQuickNav={showMobileDestinationNav}
          quickNavOpen={quickNavOpen}
          onQuickNavOpenChange={setQuickNavOpen}
          billingAccess={billingAccess}
        />
      </div>

      {showMobileDestinationNav ? (
        <div className="no-print md:hidden">
          <MobileNav
            companyContext={navigationContext}
            showPlatformAdminNav={showPlatformAdminNav}
          />
        </div>
      ) : null}

      <main data-testid="admin-shell-main" className="admin-shell-main min-h-0 min-w-0 max-w-full overflow-x-clip px-2.5 pt-2.5 sm:px-4 sm:pt-4 lg:p-5 md:overflow-y-auto">
        <PullToRefresh enabled={pullToRefreshEnabled}>
          <PwaInstallBanner />
          {redirectPending ? <AdminShellContentLoadingState /> : children}
        </PullToRefresh>
      </main>
      </div>
      </div>
      {showMobileDestinationNav ? (
        <AdminQuickNavDrawer
          open={quickNavOpen}
          onClose={() => setQuickNavOpen(false)}
          companyContext={navigationContext}
          showPlatformAdminNav={showPlatformAdminNav}
        />
      ) : null}
      {isBetaBugReportEnabled() &&
      !(isMobile && pathname.startsWith("/settings")) &&
      !isMobileDashboard ? (
        <BetaBugReportButton />
      ) : null}
    </CompanyTimezoneProvider>
    </FounderMarketingDisplayProvider>
  );
}
