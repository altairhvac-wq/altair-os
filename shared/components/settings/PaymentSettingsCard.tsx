"use client";

import { CreditCard } from "lucide-react";
import { useState, useTransition } from "react";
import {
  disableOnlineCheckoutAction,
  enableOnlineCheckoutAction,
  refreshStripePaymentAccountStatusAction,
  startStripeConnectOnboardingAction,
} from "@/app/actions/company-payments";
import { formatDateTimeInTimeZone, resolveCompanyTimeZone } from "@/shared/lib/datetime";
import { buttonClassName } from "@/shared/design-system/components/button-styles";
import {
  altairMcCardClass,
  altairMcCardPadClass,
} from "@/shared/design-system/components/mc-surface";
import {
  canEnableOnlineCheckoutAccount,
  CARD_PAYMENTS_DISPLAY_LABELS,
  formatPaymentCapabilityEnabled,
  getCardPaymentsDisplayStatus,
  getCardPaymentsPendingGuidance,
  getPaymentSettingsMainCopy,
  getPaymentSettingsPayNowClarify,
  getPaymentSettingsPaymentLinksClarify,
  getPaymentSettingsStatusBadge,
  PAYMENT_ACCOUNT_STATUS_LABELS,
  PAYMENT_SETTINGS_MANUAL_RECORDING_NOTE,
  PAYMENT_SETTINGS_STRIPE_SETUP_LATER_NOTE,
  type PaymentSetupReturnNotice,
  type StripePaymentSettingsSummary,
} from "@/shared/types/settings/payment-settings";

type PaymentSettingsCardProps = {
  stripeAccount: StripePaymentSettingsSummary | null;
  companyTimezone?: string | null;
  northStar?: boolean;
  canStartStripeSetup?: boolean;
  canManageOnlineCheckout?: boolean;
  canRefreshStripeStatus?: boolean;
  stripeOnboardingConfigured?: boolean;
  stripeTestMode?: boolean;
  paymentSetupNotice?: PaymentSetupReturnNotice | null;
};

function formatLastSyncedAt(
  value: string,
  companyTimezone?: string | null,
): string {
  return formatDateTimeInTimeZone(
    value,
    resolveCompanyTimeZone(companyTimezone),
    {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    },
  );
}

function CapabilityRow({
  label,
  enabled,
  northStar,
}: {
  label: string;
  enabled: boolean;
  northStar: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-2 first:pt-0 last:pb-0">
      <dt
        className={
          northStar ? "shrink-0 text-xs text-[#4F4638]" : "shrink-0 text-xs text-slate-500"
        }
      >
        {label}
      </dt>
      <dd
        className={
          northStar
            ? "min-w-0 truncate text-right text-sm font-medium text-[#17130E]"
            : "min-w-0 truncate text-right text-sm font-medium text-slate-900"
        }
      >
        {formatPaymentCapabilityEnabled(enabled)}
      </dd>
    </div>
  );
}

export function PaymentSettingsCard({
  stripeAccount,
  companyTimezone,
  northStar = false,
  canStartStripeSetup = false,
  canManageOnlineCheckout = false,
  canRefreshStripeStatus = false,
  stripeOnboardingConfigured = false,
  stripeTestMode = false,
  paymentSetupNotice = null,
}: PaymentSettingsCardProps) {
  const [isPending, startTransition] = useTransition();
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const isConnected = stripeAccount !== null;
  const displayStatus = stripeAccount?.status ?? "not_connected";
  const statusBadge = getPaymentSettingsStatusBadge(stripeAccount);
  const mainCopy = getPaymentSettingsMainCopy(stripeAccount);
  const payNowClarify = getPaymentSettingsPayNowClarify(stripeAccount);
  const paymentLinksClarify = getPaymentSettingsPaymentLinksClarify(stripeAccount);
  const cardPaymentsGuidance = getCardPaymentsPendingGuidance(stripeAccount);
  const cardPaymentsDisplayStatus = stripeAccount
    ? getCardPaymentsDisplayStatus(stripeAccount)
    : null;
  const canLaunchOnboarding =
    canStartStripeSetup &&
    stripeOnboardingConfigured &&
    displayStatus !== "active";
  const startButtonLabel =
    displayStatus === "pending" || displayStatus === "restricted"
      ? "Continue Stripe setup"
      : "Start Stripe setup";
  const canEnableCheckout =
    isConnected &&
    stripeAccount !== null &&
    canEnableOnlineCheckoutAccount(stripeAccount);
  const showEnableCheckoutButton =
    canManageOnlineCheckout && canEnableCheckout;
  const showDisableCheckoutButton =
    canManageOnlineCheckout &&
    isConnected &&
    stripeAccount?.onlinePaymentsEnabled === true;
  const showCheckoutControls =
    canManageOnlineCheckout &&
    isConnected &&
    (stripeAccount?.status === "active" || stripeAccount?.onlinePaymentsEnabled === true);
  const showRefreshStripeStatusButton =
    isConnected && canRefreshStripeStatus;

  const shellClass = northStar
    ? "min-w-0 rounded-[1rem] border border-[rgba(119,89,27,0.12)] bg-[#FBF7EF] p-3 sm:p-4"
    : `min-w-0 ${altairMcCardClass} ${altairMcCardPadClass}`;

  const iconWrapClass = northStar
    ? "hidden h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#EFE4CB] text-[#77591B] ring-1 ring-[rgba(119,89,27,0.12)] sm:flex"
    : "hidden h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-altair-brass/10 text-altair-brass sm:flex";

  const titleClass = northStar
    ? "text-sm font-semibold text-[#17130E] sm:text-base"
    : "text-sm font-semibold text-altair-ink sm:text-base";

  const helperClass = northStar
    ? "mt-0.5 text-xs text-[#7C7259] sm:text-sm"
    : "mt-0.5 text-xs text-altair-ink-secondary sm:text-sm";

  const noticeClass = northStar
    ? "rounded-lg border border-[rgba(119,89,27,0.14)] bg-[#FFF9EA] px-2.5 py-2 text-xs text-[#4F4638] sm:text-sm"
    : "rounded-none border border-[var(--north-star-plate-border)] bg-[var(--surface-tile)] px-2.5 py-2 text-xs text-altair-ink-secondary sm:text-sm";

  const subtleNoticeClass = northStar
    ? "text-xs text-[#7C7259] sm:text-sm"
    : "text-xs text-altair-ink-muted sm:text-sm";

  const errorNoticeClass = northStar
    ? "rounded-lg border border-red-200 bg-red-50 px-2.5 py-2 text-xs text-red-700 sm:text-sm"
    : "rounded-lg border border-red-200 bg-red-50 px-2.5 py-2 text-xs text-red-700 sm:text-sm";

  const successNoticeClass = northStar
    ? "rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-2 text-xs text-emerald-800 sm:text-sm"
    : "rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-2 text-xs text-emerald-800 sm:text-sm";

  const primaryButtonClass = buttonClassName("primary", "sm");
  const secondaryButtonClass = buttonClassName("secondary", "sm");
  const destructiveButtonClass = buttonClassName("destructive", "sm");

  const statusBadgeClass = northStar
    ? "inline-flex items-center rounded-full bg-[rgba(119,89,27,0.10)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#77591B] ring-1 ring-[rgba(119,89,27,0.16)]"
    : "inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-600 ring-1 ring-slate-200";

  const detailListClass = northStar
    ? "mt-3 divide-y divide-[rgba(119,89,27,0.10)] rounded-lg border border-[rgba(119,89,27,0.10)] bg-[#FFF9EA] px-3 py-1"
    : "mt-3 divide-y divide-slate-100 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1";

  function handleStartStripeSetup() {
    setActionError(null);
    setActionSuccess(null);

    startTransition(async () => {
      const result = await startStripeConnectOnboardingAction();
      if (result?.error) {
        setActionError(result.error);
      }
    });
  }

  function handleEnableOnlineCheckout() {
    setActionError(null);
    setActionSuccess(null);

    startTransition(async () => {
      const result = await enableOnlineCheckoutAction();
      if (result?.error) {
        setActionError(result.error);
      }
    });
  }

  function handleDisableOnlineCheckout() {
    setActionError(null);
    setActionSuccess(null);

    startTransition(async () => {
      const result = await disableOnlineCheckoutAction();
      if (result?.error) {
        setActionError(result.error);
      }
    });
  }

  function handleRefreshStripeStatus() {
    setActionError(null);
    setActionSuccess(null);

    startTransition(async () => {
      const result = await refreshStripePaymentAccountStatusAction();
      if (result?.error) {
        setActionError(result.error);
        return;
      }

      if (result?.message) {
        setActionSuccess(result.message);
      }
    });
  }

  return (
    <div className={shellClass}>
      <div className="flex items-start gap-2.5">
        <div className={iconWrapClass}>
          <CreditCard className="h-4 w-4" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className={titleClass}>Online payments</h2>
            <span className={statusBadgeClass}>{statusBadge}</span>
          </div>
          {stripeTestMode ? (
            <p className={helperClass}>Using Stripe test mode.</p>
          ) : null}
        </div>
      </div>

      <div className="mt-3 space-y-2">
        {paymentSetupNotice === "return" ? (
          <p className={noticeClass}>
            Stripe setup returned. Status will update after Stripe confirms the
            account.
          </p>
        ) : null}
        {paymentSetupNotice === "refresh" ? (
          <p className={noticeClass}>
            Stripe setup needs to be completed.
          </p>
        ) : null}
        {actionError ? <p className={errorNoticeClass}>{actionError}</p> : null}
        {actionSuccess ? <p className={successNoticeClass}>{actionSuccess}</p> : null}
        <p className={noticeClass}>{mainCopy}</p>
        {payNowClarify ? <p className={subtleNoticeClass}>{payNowClarify}</p> : null}
        {paymentLinksClarify ? (
          <p className={subtleNoticeClass}>{paymentLinksClarify}</p>
        ) : null}
        {cardPaymentsGuidance ? (
          <p className={noticeClass}>{cardPaymentsGuidance}</p>
        ) : null}
        <p className={subtleNoticeClass}>{PAYMENT_SETTINGS_MANUAL_RECORDING_NOTE}</p>
      </div>

      {isConnected &&
      stripeAccount.status === "active" &&
      stripeAccount.chargesEnabled &&
      stripeAccount.payoutsEnabled &&
      stripeAccount.onlinePaymentsEnabled &&
      (cardPaymentsDisplayStatus === null ||
        CARD_PAYMENTS_DISPLAY_LABELS[cardPaymentsDisplayStatus] ===
          "Card payments active") ? (
        /* Everything healthy — the seven-row ledger compresses to one line.
         * The full detail list below renders only when something is off and
         * the row-by-row read actually matters. */
        <p
          className={`mt-3 text-xs ${northStar ? "text-[#4F4638]" : "text-slate-600"}`}
        >
          <span className="font-semibold">Stripe active</span> — charges,
          payouts, card &amp; online payments all enabled
          {stripeAccount.lastSyncedAt
            ? ` · synced ${formatLastSyncedAt(stripeAccount.lastSyncedAt, companyTimezone)}`
            : null}
        </p>
      ) : isConnected ? (
        <dl className={detailListClass}>
          <div className="flex items-baseline justify-between gap-3 py-2 first:pt-0">
            <dt
              className={
                northStar ? "shrink-0 text-xs text-[#4F4638]" : "shrink-0 text-xs text-slate-500"
              }
            >
              Provider
            </dt>
            <dd
              className={
                northStar
                  ? "min-w-0 truncate text-right text-sm font-medium text-[#17130E]"
                  : "min-w-0 truncate text-right text-sm font-medium text-slate-900"
              }
            >
              Stripe
            </dd>
          </div>
          <div className="flex items-baseline justify-between gap-3 py-2">
            <dt
              className={
                northStar ? "shrink-0 text-xs text-[#4F4638]" : "shrink-0 text-xs text-slate-500"
              }
            >
              Account status
            </dt>
            <dd
              className={
                northStar
                  ? "min-w-0 truncate text-right text-sm font-medium text-[#17130E]"
                  : "min-w-0 truncate text-right text-sm font-medium text-slate-900"
              }
            >
              {PAYMENT_ACCOUNT_STATUS_LABELS[stripeAccount.status]}
            </dd>
          </div>
          <CapabilityRow
            label="Charges enabled"
            enabled={stripeAccount.chargesEnabled}
            northStar={northStar}
          />
          <CapabilityRow
            label="Payouts enabled"
            enabled={stripeAccount.payoutsEnabled}
            northStar={northStar}
          />
          {cardPaymentsDisplayStatus ? (
            <div className="flex items-baseline justify-between gap-3 py-2">
              <dt
                className={
                  northStar
                    ? "shrink-0 text-xs text-[#4F4638]"
                    : "shrink-0 text-xs text-slate-500"
                }
              >
                Card payments
              </dt>
              <dd
                className={
                  northStar
                    ? "min-w-0 truncate text-right text-sm font-medium text-[#17130E]"
                    : "min-w-0 truncate text-right text-sm font-medium text-slate-900"
                }
              >
                {CARD_PAYMENTS_DISPLAY_LABELS[cardPaymentsDisplayStatus]}
              </dd>
            </div>
          ) : null}
          <CapabilityRow
            label="Online payments enabled"
            enabled={stripeAccount.onlinePaymentsEnabled}
            northStar={northStar}
          />
          {stripeAccount.lastSyncedAt ? (
            <div className="flex items-baseline justify-between gap-3 py-2">
              <dt
                className={
                  northStar
                    ? "shrink-0 text-xs text-[#4F4638]"
                    : "shrink-0 text-xs text-slate-500"
                }
              >
                Last synced
              </dt>
              <dd
                className={
                  northStar
                    ? "min-w-0 truncate text-right text-sm font-medium text-[#17130E]"
                    : "min-w-0 truncate text-right text-sm font-medium text-slate-900"
                }
              >
                {formatLastSyncedAt(stripeAccount.lastSyncedAt, companyTimezone)}
              </dd>
            </div>
          ) : null}
        </dl>
      ) : null}

      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        {canLaunchOnboarding ? (
          <button
            type="button"
            onClick={handleStartStripeSetup}
            disabled={isPending}
            className={primaryButtonClass}
          >
            {isPending ? "Opening Stripe…" : startButtonLabel}
          </button>
        ) : (
          <button type="button" disabled className={primaryButtonClass}>
            {canStartStripeSetup && !stripeOnboardingConfigured
              ? "Stripe setup not configured"
              : displayStatus === "active"
                ? "Stripe account connected"
                : "Stripe setup requires owner or admin"}
          </button>
        )}
        {showCheckoutControls ? (
          showEnableCheckoutButton ? (
            <button
              type="button"
              onClick={handleEnableOnlineCheckout}
              disabled={isPending}
              className={primaryButtonClass}
            >
              {isPending ? "Enabling online payments…" : "Enable online payments"}
            </button>
          ) : showDisableCheckoutButton ? (
            <button
              type="button"
              onClick={handleDisableOnlineCheckout}
              disabled={isPending}
              className={destructiveButtonClass}
            >
              {isPending ? "Disabling online payments…" : "Disable online payments"}
            </button>
          ) : null
        ) : null}
        {showRefreshStripeStatusButton ? (
          <button
            type="button"
            onClick={handleRefreshStripeStatus}
            disabled={isPending}
            className={secondaryButtonClass}
          >
            {isPending ? "Refreshing Stripe status…" : "Refresh Stripe status"}
          </button>
        ) : null}
      </div>

      {!isConnected && canStartStripeSetup ? (
        <p className={`${subtleNoticeClass} mt-2`}>
          {PAYMENT_SETTINGS_STRIPE_SETUP_LATER_NOTE}
        </p>
      ) : null}
    </div>
  );
}
