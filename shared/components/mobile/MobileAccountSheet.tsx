"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  Check,
  ChevronRight,
  CreditCard,
  Eye,
  LogOut,
  Smartphone,
} from "lucide-react";
import { logoutAction } from "@/app/actions/auth";
import { switchCompanyAction } from "@/app/actions/company-switcher";
import type { ActiveCompanyContext, MembershipWithCompany } from "@/lib/database/types";
import {
  COMPANY_ROLE_LABELS,
  normalizeCompanyRole,
} from "@/lib/database/types/roles";
import type { CompanyBillingAccess } from "@/lib/saas-billing/types";
import { BetaBugReportButton } from "@/shared/components/beta-feedback/BetaBugReportButton";
import { getSubscriptionBillingBannerModel } from "@/shared/components/billing/subscription-billing-banner-model";
import { AvatarUploadControl } from "@/shared/components/profile/AvatarUploadControl";
import { isStandaloneDisplayMode } from "@/shared/components/pwa/pwa-utils";
import { MobileSheet, MobileSheetPanel } from "@/shared/components/ui/mobile-sheet";
import { StatusPill, type StatusPillTone } from "@/shared/design-system/components";
import {
  OWNER_VIEW_MODE_DESCRIPTIONS,
  OWNER_VIEW_MODE_LABELS,
  type OwnerViewMode,
} from "@/shared/lib/owner-view-mode";

const TITLE_ID = "mobile-account-sheet-title";

const VIEW_MODE_OPTIONS: OwnerViewMode[] = [
  "owner_admin",
  "technician",
  "dispatch",
];

const BILLING_TONE_TO_PILL: Record<"info" | "warning" | "error", StatusPillTone> = {
  info: "info",
  warning: "warning",
  error: "danger",
};

const rowClass =
  "flex min-h-[3.25rem] w-full touch-manipulation items-center gap-3 px-4 text-left text-[15px] font-semibold text-slate-900 transition-colors hover:bg-slate-50 active:bg-slate-100";

type MobileAccountSheetProps = {
  open: boolean;
  onClose: () => void;
  companyContext: ActiveCompanyContext;
  isOwner: boolean;
  viewMode: OwnerViewMode;
  onViewModeChange: (viewMode: OwnerViewMode) => void;
  showFeedback: boolean;
  /** Admin shell only: subscription state, shown as a row that opens billing. */
  billingAccess?: CompanyBillingAccess | null;
  /** All memberships; a switch section appears when there is more than one. */
  userCompanies?: MembershipWithCompany[];
};

/**
 * Phone account sheet shared by the admin and technician shells.
 *
 * Phone audit 2026-10-24: both shells packed every account control into the
 * top bar (menu, company switcher, "View as", trial pill, bell, avatar, sign
 * out). At 375px the admin bell sat on top of the menu button, the trial pill
 * covered the avatar and the sign-out icon fell off the right edge; the
 * technician bell was 36px and flush against "View as". Everything that is
 * not a daily action now lives here behind one 44px avatar button: who you
 * are, the owner's role preview, subscription status, install, feedback and
 * sign out. The headers keep only the bell and the avatar (plus the menu
 * button on admin pages that need it).
 */
export function MobileAccountSheet({
  open,
  onClose,
  companyContext,
  isOwner,
  viewMode,
  onViewModeChange,
  showFeedback,
  billingAccess = null,
  userCompanies = [],
}: MobileAccountSheetProps) {
  const router = useRouter();
  const [showInstall, setShowInstall] = useState(false);
  const [switchError, setSwitchError] = useState<string | null>(null);
  const [isSwitching, startSwitch] = useTransition();
  const canSwitchCompany = userCompanies.length > 1;

  function handleSwitchCompany(companyId: string) {
    if (isSwitching || companyId === companyContext.company.id) {
      return;
    }

    setSwitchError(null);
    startSwitch(async () => {
      const result = await switchCompanyAction(companyId);

      if (result.error) {
        setSwitchError(result.error);
        return;
      }

      onClose();
      router.refresh();
    });
  }

  useEffect(() => {
    if (!open) {
      return;
    }
    // Read after mount: display-mode media queries do not exist on the server.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setShowInstall(!isStandaloneDisplayMode());
  }, [open]);

  if (!open) {
    return null;
  }

  const displayName =
    companyContext.profile.full_name?.trim() ||
    companyContext.user.email ||
    "Account";
  const role = normalizeCompanyRole(companyContext.role);
  const roleLabel = role ? COMPANY_ROLE_LABELS[role] : "Member";
  const billing = billingAccess
    ? getSubscriptionBillingBannerModel(
        billingAccess,
        billingAccess.canManageBilling,
      )
    : null;

  return (
    <MobileSheet onClose={onClose} ariaLabelledBy={TITLE_ID} zIndex={50}>
      <MobileSheetPanel
        maxHeight="90"
        className="pb-[max(0.75rem,env(safe-area-inset-bottom,0px))]"
      >
        <div className="flex shrink-0 items-center gap-3 border-b border-slate-100 px-4 py-4">
          <AvatarUploadControl
            name={displayName}
            avatarUrl={companyContext.profile.avatar_url}
            target={{ kind: "self" }}
            canEdit
            title="Change your photo"
            className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-full bg-altair-graphite text-lg font-bold text-altair-paper shadow-sm ring-2 ring-white"
          />
          <div className="min-w-0 flex-1">
            <h2
              id={TITLE_ID}
              className="truncate text-base font-bold text-slate-900"
            >
              {displayName}
            </h2>
            <p className="truncate text-sm text-altair-ink-on-paper-muted">
              {roleLabel} · {companyContext.company.name}
            </p>
            {companyContext.user.email &&
            companyContext.user.email !== displayName ? (
              <p className="truncate text-xs text-altair-ink-on-paper-muted">
                {companyContext.user.email}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            data-mobile-sheet-initial-focus
            onClick={onClose}
            className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-xl px-3 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
          >
            Done
          </button>
        </div>

        <div
          className="overlay-scroll-body min-h-0 flex-1 overflow-y-auto"
          data-no-pull-refresh
        >
          {isOwner ? (
            <section
              aria-label="View as"
              className="border-b border-slate-100 py-2"
            >
              <p className="flex items-center gap-1.5 px-4 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-altair-ink-on-paper-muted">
                <Eye className="h-3.5 w-3.5" aria-hidden />
                View as
              </p>
              <p className="px-4 pb-2 text-xs leading-snug text-altair-ink-on-paper-muted">
                Preview navigation only. Your owner permissions stay the same.
              </p>
              <div role="radiogroup" aria-label="View as">
                {VIEW_MODE_OPTIONS.map((mode) => {
                  const isActive = mode === viewMode;

                  return (
                    <button
                      key={mode}
                      type="button"
                      role="radio"
                      aria-checked={isActive}
                      onClick={() => {
                        onClose();
                        onViewModeChange(mode);
                      }}
                      className={rowClass}
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block">
                          {OWNER_VIEW_MODE_LABELS[mode]}
                        </span>
                        <span className="block text-xs font-normal text-altair-ink-on-paper-muted">
                          {OWNER_VIEW_MODE_DESCRIPTIONS[mode]}
                        </span>
                      </span>
                      {isActive ? (
                        <Check
                          className="h-5 w-5 shrink-0 text-cyan-700"
                          aria-hidden
                        />
                      ) : (
                        <span className="h-5 w-5 shrink-0" aria-hidden />
                      )}
                    </button>
                  );
                })}
              </div>
            </section>
          ) : null}

          {canSwitchCompany ? (
            <section
              className="border-b border-slate-100 py-2"
              aria-label="Switch company"
            >
              <p className="flex items-center gap-1.5 px-4 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-altair-ink-on-paper-muted">
                <Building2 className="h-3.5 w-3.5" aria-hidden />
                Company
              </p>
              <div role="radiogroup" aria-label="Company">
                {userCompanies.map((membership) => {
                  const isActive =
                    membership.company_id === companyContext.company.id;
                  const membershipRole = normalizeCompanyRole(membership.role);

                  return (
                    <button
                      key={membership.company_id}
                      type="button"
                      role="radio"
                      aria-checked={isActive}
                      disabled={isSwitching}
                      onClick={() => handleSwitchCompany(membership.company_id)}
                      className={`${rowClass} disabled:opacity-60`}
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate">
                          {membership.company.name}
                        </span>
                        <span className="block text-xs font-normal text-altair-ink-on-paper-muted">
                          {membershipRole
                            ? COMPANY_ROLE_LABELS[membershipRole]
                            : "Member"}
                        </span>
                      </span>
                      {isActive ? (
                        <Check
                          className="h-5 w-5 shrink-0 text-cyan-700"
                          aria-hidden
                        />
                      ) : (
                        <span className="h-5 w-5 shrink-0" aria-hidden />
                      )}
                    </button>
                  );
                })}
              </div>
              {switchError ? (
                <p className="px-4 pt-1 text-xs text-red-600" role="alert">
                  {switchError}
                </p>
              ) : null}
            </section>
          ) : null}

          {billing ? (
            <section
              className="border-b border-slate-100 py-2"
              aria-label="Subscription"
            >
              {billing.showManageAction ? (
                <Link
                  href="/settings/subscription"
                  onClick={onClose}
                  className={rowClass}
                >
                  <CreditCard
                    className="h-5 w-5 shrink-0 text-altair-ink-on-paper-muted"
                    aria-hidden
                  />
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span>Subscription</span>
                      <StatusPill
                        tone={BILLING_TONE_TO_PILL[billing.tone]}
                        size="sm"
                      >
                        {billing.shortLabel}
                      </StatusPill>
                    </span>
                    <span className="mt-0.5 block text-xs font-normal leading-snug text-altair-ink-on-paper-muted">
                      {billing.description}
                    </span>
                  </span>
                  <ChevronRight
                    className="h-5 w-5 shrink-0 text-slate-300"
                    aria-hidden
                  />
                </Link>
              ) : (
                <div className={`${rowClass} hover:bg-transparent active:bg-transparent`}>
                  <CreditCard
                    className="h-5 w-5 shrink-0 text-altair-ink-on-paper-muted"
                    aria-hidden
                  />
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span>Subscription</span>
                      <StatusPill
                        tone={BILLING_TONE_TO_PILL[billing.tone]}
                        size="sm"
                      >
                        {billing.shortLabel}
                      </StatusPill>
                    </span>
                    <span className="mt-0.5 block text-xs font-normal leading-snug text-altair-ink-on-paper-muted">
                      {billing.description}
                    </span>
                  </span>
                </div>
              )}
            </section>
          ) : null}

          <section className="border-b border-slate-100 py-2" aria-label="App">
            {showInstall ? (
              <Link href="/install" onClick={onClose} className={rowClass}>
                <Smartphone
                  className="h-5 w-5 shrink-0 text-altair-ink-on-paper-muted"
                  aria-hidden
                />
                <span className="min-w-0 flex-1">
                  <span className="block">Install Altair on this phone</span>
                  <span className="block text-xs font-normal text-altair-ink-on-paper-muted">
                    Opens like an app, no browser bar
                  </span>
                </span>
                <ChevronRight
                  className="h-5 w-5 shrink-0 text-slate-300"
                  aria-hidden
                />
              </Link>
            ) : null}
            {showFeedback ? (
              <div className="px-4 py-2">
                <BetaBugReportButton
                  inlineOnly
                  className="min-h-[3rem] rounded-xl text-[15px]"
                />
                <p className="mt-1.5 px-1 text-xs text-altair-ink-on-paper-muted">
                  Something slow, broken, or confusing? Tell us from here.
                </p>
              </div>
            ) : null}
          </section>

          <form action={logoutAction} className="py-2">
            <button
              type="submit"
              className={`${rowClass} text-altair-danger-foreground`}
            >
              <LogOut className="h-5 w-5 shrink-0" aria-hidden />
              Sign out
            </button>
          </form>
        </div>
      </MobileSheetPanel>
    </MobileSheet>
  );
}
