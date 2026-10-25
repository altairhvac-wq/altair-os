"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { AltairLogo } from "@/shared/components/brand/AltairLogo";
import type { ActiveCompanyContext, MembershipWithCompany } from "@/lib/database/types";
import { CompanyTimezoneProvider } from "@/shared/lib/company-timezone";
import { CompanySwitcher } from "@/shared/components/company/CompanySwitcher";
import { MobileAccountSheet } from "@/shared/components/mobile/MobileAccountSheet";
import { PullToRefresh } from "@/shared/components/mobile/PullToRefresh";
import { TechnicianNotificationBadgeProvider } from "@/shared/components/notifications/TechnicianNotificationBadgeContext";
import { TechnicianNotificationLink } from "@/shared/components/notifications/TechnicianNotificationLink";
import { AvatarUploadControl } from "@/shared/components/profile/AvatarUploadControl";
import { useOwnerViewMode } from "@/shared/components/view-mode/useOwnerViewMode";
import { TechnicianBottomNav } from "./TechnicianBottomNav";
import { TechnicianConnectivityBanner } from "./TechnicianConnectivityBanner";
import { TechnicianShellContentLoadingState } from "./TechnicianShellContentLoadingState";
import { FounderMarketingDisplayProvider } from "@/shared/components/display/FounderMarketingDisplayContext";
import { isBetaBugReportEnabled } from "@/lib/beta/beta-bug-report";

type TechnicianMobileShellProps = {
  children: React.ReactNode;
  companyContext: ActiveCompanyContext;
  userCompanies: MembershipWithCompany[];
  unreadNotificationCount?: number;
  hideDemoPrefixes?: boolean;
};

/**
 * Technician phone shell: one header, one bottom tab bar, one account sheet.
 *
 * Phone audit 2026-10-24 removed the hamburger drawer (it duplicated the tab
 * bar item-for-item), the inline "View as" control, the header sign-out icon
 * and the floating feedback bubble. Those moved into the account sheet behind
 * the avatar, which leaves the header with two 44px targets that never touch.
 */
export function TechnicianMobileShell({
  children,
  companyContext,
  userCompanies,
  unreadNotificationCount = 0,
  hideDemoPrefixes = false,
}: TechnicianMobileShellProps) {
  const pathname = usePathname();
  const [accountOpen, setAccountOpen] = useState(false);
  // Hydration guard: `redirectPending` is client-derived (owner view-mode
  // redirect) and can be true on the client's first render while the server
  // rendered the children — swapping in the loading skeleton during
  // hydration caused a server/client mismatch. Only honor redirectPending
  // after mount so the first client render always matches the server.
  const [mounted, setMounted] = useState(false);
  const { isOwner, viewMode, setViewMode, navigationContext, redirectPending } =
    useOwnerViewMode(companyContext);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setAccountOpen(false);
  }, [pathname]);

  const displayName =
    companyContext.profile.full_name?.trim() ||
    companyContext.user.email ||
    "Technician";
  const showFeedback = isBetaBugReportEnabled();

  return (
    <FounderMarketingDisplayProvider hideDemoPrefixes={hideDemoPrefixes}>
    <CompanyTimezoneProvider timeZone={companyContext.company.timezone}>
      <TechnicianNotificationBadgeProvider
        initialUnreadCount={unreadNotificationCount}
      >
      <div className="tech-canvas min-h-dvh max-w-full overflow-x-clip">
        <div className="tech-shell mx-auto flex min-h-dvh min-w-0 flex-col">
          <header className="tech-header tech-header-safe sticky top-0 z-30">
            <div className="flex min-h-14 min-w-0 items-center gap-2.5 px-3 pb-2 pt-0.5">
              <AltairLogo variant="gold" size="sm" showWordmark={false} />
              <div className="min-w-0 flex-1">
                <CompanySwitcher
                  activeCompanyId={companyContext.company.id}
                  companies={userCompanies}
                  variant="technician"
                  showRole={false}
                />
                {isOwner && viewMode === "technician" ? (
                  <p className="truncate text-[11px] font-medium text-altair-ink-on-paper-muted">
                    Technician view · owner access
                  </p>
                ) : null}
              </div>
              <TechnicianNotificationLink />
              <button
                type="button"
                onClick={() => setAccountOpen(true)}
                aria-haspopup="dialog"
                aria-expanded={accountOpen}
                aria-label={`Account, ${displayName}`}
                data-testid="tech-account-button"
                className="inline-flex h-11 w-11 shrink-0 touch-manipulation items-center justify-center rounded-xl transition-colors hover:bg-slate-100 active:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-600"
              >
                <AvatarUploadControl
                  name={displayName}
                  avatarUrl={companyContext.profile.avatar_url}
                  target={{ kind: "self" }}
                  canEdit={false}
                  className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-altair-graphite text-xs font-bold text-altair-paper ring-2 ring-white shadow-sm"
                />
              </button>
            </div>
          </header>

          <main className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto px-4 py-4 pb-[max(6rem,calc(5.5rem+env(safe-area-inset-bottom,0px)))] sm:px-5 sm:py-5">
            <PullToRefresh>
              <TechnicianConnectivityBanner />
              {mounted && redirectPending ? (
                <TechnicianShellContentLoadingState />
              ) : (
                children
              )}
            </PullToRefresh>
          </main>

          <TechnicianBottomNav companyContext={navigationContext} />
          <MobileAccountSheet
            open={accountOpen}
            onClose={() => setAccountOpen(false)}
            companyContext={companyContext}
            userCompanies={userCompanies}
            isOwner={isOwner}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            showFeedback={showFeedback}
          />
        </div>
      </div>
    </TechnicianNotificationBadgeProvider>
    </CompanyTimezoneProvider>
    </FounderMarketingDisplayProvider>
  );
}
