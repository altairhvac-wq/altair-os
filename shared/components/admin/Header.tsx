"use client";

import { LogOut } from "lucide-react";
import {
  canAccessOperationalJobsArea,
  getCompanyAccessScope,
} from "@/lib/database/access-control";
import type { ActiveCompanyContext, MembershipWithCompany } from "@/lib/database/types";
import type { CompanyBillingAccess } from "@/lib/saas-billing/types";
import { logoutAction } from "@/app/actions/auth";
import { CompanySwitcher } from "@/shared/components/company/CompanySwitcher";
import { HeaderScheduleCalendar } from "@/shared/components/admin/HeaderScheduleCalendar";
import { AvatarUploadControl } from "@/shared/components/profile/AvatarUploadControl";
import { SubscriptionBillingBanner } from "@/shared/components/billing/SubscriptionBillingBanner";
import { NotificationBell } from "@/shared/components/notifications/NotificationBell";
import { OwnerViewSwitcher } from "@/shared/components/view-mode/OwnerViewSwitcher";
import { QuickNavToggle } from "@/shared/components/mobile/QuickNavToggle";
import { useCompanyTimezone } from "@/shared/lib/company-timezone";
import { formatDateInTimeZone, getHourInTimeZone } from "@/shared/lib/datetime";
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
  /** When set, shows the mobile Quick Navigation toggle (hidden on desktop). */
  showQuickNav?: boolean;
  quickNavOpen?: boolean;
  onQuickNavOpenChange?: (open: boolean) => void;
  /** Compact trial / billing badge near the account chrome. */
  billingAccess?: CompanyBillingAccess | null;
};

/**
 * Greeting derived from the COMPANY timezone, not the runtime's local clock.
 * The previous version used `new Date().getHours()`, which differs between
 * the server (UTC on Vercel) and the browser — the resulting text mismatch
 * threw React hydration error #418 on every page load.
 */
function getTimeOfDayGreeting(
  timeZone: string,
  reference = new Date(),
): string {
  const hour = getHourInTimeZone(reference, timeZone);
  if (hour < 12) {
    return "Good morning";
  }
  if (hour < 17) {
    return "Good afternoon";
  }
  return "Good evening";
}

function getGreetingName(
  companyName: string | undefined,
  userDisplayName: string | undefined,
): string {
  const company = companyName?.trim();
  if (company) {
    return company;
  }

  const trimmed = userDisplayName?.trim();
  if (!trimmed) {
    return "there";
  }

  const first = trimmed.split(/\s+/)[0] ?? trimmed;
  return first.charAt(0).toUpperCase() + first.slice(1);
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
  showQuickNav = false,
  quickNavOpen = false,
  onQuickNavOpenChange,
  billingAccess = null,
}: HeaderProps) {
  const displayName =
    companyContext.profile.full_name ??
    companyContext.user.email ??
    "User";
  const accessScope = getCompanyAccessScope(companyContext);
  const notificationAccess = buildNotificationAccess({
    canManageCustomers: accessScope.canManageCustomers,
    canViewBilling: accessScope.canViewBilling,
    canViewAllJobs: accessScope.canViewAllJobs,
    canViewCompanyExpenses: accessScope.canViewCompanyExpenses,
    canViewAssignedJobs: companyContext.permissions.viewAssignedJobs,
  });
  /* PRESTIGE: one chrome per ROLE, not per breakpoint. The header used to be a
   * light bar below 768px and dark chrome above it (driven by a
   * `useMobileViewport()` read), so the same owner saw two different products
   * depending on the device. Chrome is now the graphite surface at every
   * width, and the child controls are told so — which also removed a
   * client-side viewport read from the shell's first paint. */
  const northStarChrome = true;
  const chromeTone = "dark" as const;
  const showMobileQuickNav =
    showQuickNav && typeof onQuickNavOpenChange === "function";
  const showScheduleCalendar = canAccessOperationalJobsArea(companyContext);
  const timeZone = useCompanyTimezone();
  const greetingName = getGreetingName(
    companyContext.company.name,
    displayName,
  );
  const greeting = `${getTimeOfDayGreeting(timeZone)}, ${greetingName}`;
  const dateLabel = formatDateInTimeZone(new Date(), timeZone, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <header className="admin-premium-header mobile-chrome-header-safe relative z-40 flex w-full max-w-full shrink-0 items-center justify-between gap-2 px-3 sm:gap-2.5 sm:px-5 md:h-[3.75rem] md:min-h-[3.75rem] md:pt-0">
      <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
        {showMobileQuickNav ? (
          <div className="md:hidden">
            <QuickNavToggle
              open={quickNavOpen}
              onOpenChange={(open) => onQuickNavOpenChange?.(open)}
            />
          </div>
        ) : null}

        {/* Hidden below `lg`: with the tablet rail in place the top bar's
          * functional controls take the width they need, and the greeting was
          * truncating to "Good ev…" / "Satu…", which reads as a rendering bug
          * rather than identity. The page header names the page anyway, so the
          * serif moment simply waits until there is room for it. */}
        <div className="min-w-0 max-lg:hidden">
          {/* PRESTIGE: the greeting is the product's one piece of display
            * typography — set in the Altair serif rather than the interface
            * sans. It is the only place the serif appears in the shell, which
            * is what makes it read as identity instead of decoration. */}
          <p
            className={`truncate font-altair text-[1.0625rem] leading-tight tracking-[0.005em] sm:text-[1.1875rem] ${
              northStarChrome ? "" : "text-slate-900 md:text-slate-50"
            }`}
          >
            {greeting}
          </p>
          <div className="mt-0.5 flex min-w-0 items-center gap-1">
            <p
              className={`truncate text-xs leading-none sm:text-[13px] ${
                northStarChrome ? "" : "text-slate-500 md:text-slate-400"
              }`}
            >
              {dateLabel}
            </p>
            {showScheduleCalendar ? (
              <HeaderScheduleCalendar
                tone={chromeTone}
                triggerClassName={
                  northStarChrome
                    ? "north-star-header-calendar -m-1 p-1"
                    : "-m-1 p-1"
                }
              />
            ) : null}
          </div>
          {/* Keep mobile page title available to screen readers for orientation */}
          <p className="sr-only md:hidden">
            {title}
            {description ? `. ${description}` : ""}
          </p>
        </div>
      </div>

      {/* `min-w-0`, not `shrink-0`.
       *
       * At 390px this cluster measured 407px inside a 390px header and pushed
       * every admin route 37px sideways — the page itself panned, not a table
       * inside it. The trial pill already declares `min-w-0 shrink
       * max-w-[9.5rem]`, but a `shrink-0` parent blocks a child from ever
       * shrinking, so that intent never applied. Letting the cluster compress
       * lets the pill truncate as it was written to. */}
      <div className="flex min-w-0 items-center gap-1 sm:gap-3">
        {/*
         * No global Search control here. A Search button used to ship in this
         * slot with no onClick, no form, and no dialog — it was announced to
         * screen readers as "Search, button" on every admin page and did
         * nothing when activated. Global search does not exist yet (each list
         * page owns its own search field); restore this only alongside a real
         * command palette or search route.
         */}
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
        {/* `min-w-0` so this can compress too. At 390px its children — view
         * switcher 120px, trial pill 133px, avatar 36px, sign out 36px, plus
         * gaps — reached x=427 on a 390px screen. `html` and `body` are
         * `overflow-x-clip`, so the page did not pan; the Sign out button was
         * simply cut off and unreachable on a phone. */}
        <div
          className={`flex min-w-0 items-center gap-2 pl-2 sm:ml-2 sm:gap-3 sm:pl-4 ${
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
          {billingAccess ? (
            <SubscriptionBillingBanner
              access={billingAccess}
              canManageBilling={billingAccess.canManageBilling}
              className="max-w-[9.5rem] sm:max-w-[14rem]"
            />
          ) : null}
          <AvatarUploadControl
            name={displayName}
            avatarUrl={companyContext.profile.avatar_url}
            target={{ kind: "self" }}
            canEdit
            title={`${displayName} — change your photo`}
            className={
              northStarChrome
                ? "north-star-header-avatar flex h-9 w-9 items-center justify-center overflow-hidden rounded-full text-sm font-bold ring-2"
                : "hidden h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-cyan-500 to-cyan-700 text-sm font-bold text-white shadow-sm shadow-cyan-600/30 ring-2 ring-white sm:flex md:ring-white/25"
            }
          />
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
