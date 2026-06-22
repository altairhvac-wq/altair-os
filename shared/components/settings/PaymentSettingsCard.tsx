"use client";

import { CreditCard } from "lucide-react";
import { useState, useTransition } from "react";
import { startStripeConnectOnboardingAction } from "@/app/actions/company-payments";
import { formatDateTimeInTimeZone, resolveCompanyTimeZone } from "@/shared/lib/datetime";
import {
  formatPaymentCapabilityEnabled,
  PAYMENT_ACCOUNT_STATUS_LABELS,
  type PaymentSetupReturnNotice,
  type StripePaymentSettingsSummary,
} from "@/shared/types/settings/payment-settings";

type PaymentSettingsCardProps = {
  stripeAccount: StripePaymentSettingsSummary | null;
  companyTimezone?: string | null;
  northStar?: boolean;
  canStartStripeSetup?: boolean;
  stripeOnboardingConfigured?: boolean;
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
          northStar ? "shrink-0 text-xs text-[#6B6255]" : "shrink-0 text-xs text-slate-500"
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
  stripeOnboardingConfigured = false,
  paymentSetupNotice = null,
}: PaymentSettingsCardProps) {
  const [isPending, startTransition] = useTransition();
  const [actionError, setActionError] = useState<string | null>(null);

  const isConnected = stripeAccount !== null;
  const displayStatus = stripeAccount?.status ?? "not_connected";
  const statusLabel = PAYMENT_ACCOUNT_STATUS_LABELS[displayStatus];
  const canLaunchOnboarding =
    canStartStripeSetup &&
    stripeOnboardingConfigured &&
    displayStatus !== "active";
  const startButtonLabel =
    displayStatus === "pending" ? "Continue Stripe setup" : "Start Stripe setup";

  const shellClass = northStar
    ? "min-w-0 rounded-[1rem] border border-[rgba(138,99,36,0.12)] bg-[#FBF7EF] p-3 sm:p-4"
    : "admin-card min-w-0 p-3 sm:p-4";

  const iconWrapClass = northStar
    ? "hidden h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#EFE4CB] text-[#8A6324] ring-1 ring-[rgba(138,99,36,0.12)] sm:flex"
    : "hidden h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 sm:flex";

  const titleClass = northStar
    ? "text-sm font-semibold text-[#17130E] sm:text-base"
    : "admin-heading-section text-sm sm:text-base";

  const helperClass = northStar
    ? "mt-0.5 text-xs text-[#6B6255] sm:text-sm"
    : "admin-text-helper mt-0.5 text-xs sm:text-sm";

  const noticeClass = northStar
    ? "rounded-lg border border-[rgba(138,99,36,0.14)] bg-[#FFF9EA] px-2.5 py-2 text-xs text-[#4F4638] sm:text-sm"
    : "rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 text-xs text-slate-600 sm:text-sm";

  const errorNoticeClass = northStar
    ? "rounded-lg border border-red-200 bg-red-50 px-2.5 py-2 text-xs text-red-700 sm:text-sm"
    : "rounded-lg border border-red-200 bg-red-50 px-2.5 py-2 text-xs text-red-700 sm:text-sm";

  const disabledButtonClass = northStar
    ? "inline-flex min-h-9 cursor-not-allowed items-center justify-center rounded-lg border border-[rgba(138,99,36,0.16)] bg-[#F5F0E4] px-3 text-xs font-semibold text-[#6B6255] opacity-80 sm:text-sm"
    : "inline-flex min-h-9 cursor-not-allowed items-center justify-center rounded-lg border border-slate-200 bg-slate-100 px-3 text-xs font-semibold text-slate-500 sm:text-sm";

  const enabledButtonClass = northStar
    ? "inline-flex min-h-9 items-center justify-center rounded-lg border border-[rgba(138,99,36,0.24)] bg-[#8A6324] px-3 text-xs font-semibold text-white transition-colors hover:bg-[#75541F] disabled:cursor-not-allowed disabled:opacity-70 sm:text-sm"
    : "inline-flex min-h-9 items-center justify-center rounded-lg border border-cyan-600 bg-cyan-600 px-3 text-xs font-semibold text-white transition-colors hover:bg-cyan-700 disabled:cursor-not-allowed disabled:opacity-70 sm:text-sm";

  const statusBadgeClass = northStar
    ? "inline-flex items-center rounded-full bg-[rgba(138,99,36,0.10)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#8A6324] ring-1 ring-[rgba(138,99,36,0.16)]"
    : "inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-600 ring-1 ring-slate-200";

  const detailListClass = northStar
    ? "mt-3 divide-y divide-[rgba(138,99,36,0.10)] rounded-lg border border-[rgba(138,99,36,0.10)] bg-[#FFF9EA] px-3 py-1"
    : "mt-3 divide-y divide-slate-100 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1";

  function handleStartStripeSetup() {
    setActionError(null);

    startTransition(async () => {
      const result = await startStripeConnectOnboardingAction();
      if (result?.error) {
        setActionError(result.error);
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
            <span className={statusBadgeClass}>{statusLabel}</span>
          </div>
          <p className={helperClass}>Stripe Connect account status.</p>
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
        {isConnected ? (
          <>
            <p className={noticeClass}>Stripe account linked.</p>
            {!stripeAccount.onlinePaymentsEnabled ? (
              <p className={noticeClass}>
                Checkout is still disabled until online payments are enabled.
              </p>
            ) : null}
          </>
        ) : (
          <>
            <p className={noticeClass}>Online payments are not connected yet.</p>
            <p className={noticeClass}>
              Connect Stripe to prepare for online payments. Checkout is not
              active in this build.
            </p>
          </>
        )}
      </div>

      {isConnected ? (
        <dl className={detailListClass}>
          <div className="flex items-baseline justify-between gap-3 py-2 first:pt-0">
            <dt
              className={
                northStar ? "shrink-0 text-xs text-[#6B6255]" : "shrink-0 text-xs text-slate-500"
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
                northStar ? "shrink-0 text-xs text-[#6B6255]" : "shrink-0 text-xs text-slate-500"
              }
            >
              Status
            </dt>
            <dd
              className={
                northStar
                  ? "min-w-0 truncate text-right text-sm font-medium text-[#17130E]"
                  : "min-w-0 truncate text-right text-sm font-medium text-slate-900"
              }
            >
              {statusLabel}
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
                    ? "shrink-0 text-xs text-[#6B6255]"
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
            className={enabledButtonClass}
          >
            {isPending ? "Opening Stripe…" : startButtonLabel}
          </button>
        ) : (
          <button type="button" disabled className={disabledButtonClass}>
            {canStartStripeSetup && !stripeOnboardingConfigured
              ? "Stripe setup unavailable (not configured)"
              : displayStatus === "active"
                ? "Stripe account connected"
                : "Stripe setup requires owner or admin"}
          </button>
        )}
        <button type="button" disabled className={disabledButtonClass}>
          Online checkout is not active yet
        </button>
      </div>
    </div>
  );
}
