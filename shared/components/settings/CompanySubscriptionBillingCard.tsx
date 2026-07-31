"use client";

import { CreditCard } from "lucide-react";
import { useState, useTransition } from "react";
import {
  createBillingPortalSessionAction,
  createSubscriptionCheckoutAction,
} from "@/app/actions/saas-billing";
import type {
  CompanySubscriptionBillingSummary,
  SaasBillingInterval,
} from "@/lib/saas-billing/types";
import {
  SAAS_BILLING_INTERVALS,
  SAAS_CHECKOUT_PLAN_KEYS,
  SAAS_PLAN_LABELS,
  SAAS_SUBSCRIPTION_CATALOG,
  SAAS_TRIAL_CONFIG,
  getSaasPlanListPriceUsd,
  type SaasCheckoutPlanKey,
} from "@/shared/lib/saas-billing-labels";
import { OPERATIONAL_STATUS_BADGE_BASE } from "@/shared/lib/operational-status-styles";

type CompanySubscriptionBillingCardProps = {
  summary: CompanySubscriptionBillingSummary | null;
  canManageSubscription?: boolean;
  checkoutConfigured?: boolean;
  northStar?: boolean;
  loadError?: string | null;
};

type BadgeTone = "success" | "warning" | "danger" | "info" | "neutral" | "brass";

const INTERVAL_LABELS: Record<SaasBillingInterval, string> = {
  monthly: "Monthly",
  annual: "Annual",
};

const BADGE_TONE_CLASSES: Record<BadgeTone, string> = {
  success:
    "bg-altair-success-surface text-altair-success-foreground ring-altair-success/15",
  warning:
    "bg-altair-warning-surface text-altair-warning-foreground ring-altair-warning/15",
  danger:
    "bg-altair-danger-surface text-altair-danger-foreground ring-altair-danger/15",
  info: "bg-altair-information-surface text-altair-information-foreground ring-altair-information/15",
  neutral: "bg-altair-paper-subtle text-altair-ink-secondary ring-altair-border",
  brass: "bg-[#FFF3D6] text-[#9C7424] ring-[rgba(138,99,36,0.18)]",
};

function formatDateLabel(value: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function trialDaysRemaining(trialEndsAt: string | null): number | null {
  if (!trialEndsAt) return null;
  const end = new Date(trialEndsAt).getTime();
  if (Number.isNaN(end)) return null;
  const days = Math.ceil((end - Date.now()) / (1000 * 60 * 60 * 24));
  return days > 0 ? days : null;
}

function formatCheckoutPriceLabel(
  planKey: SaasCheckoutPlanKey,
  interval: SaasBillingInterval,
): string {
  const amount = getSaasPlanListPriceUsd(planKey, interval);
  if (amount == null) return SAAS_PLAN_LABELS[planKey];
  return interval === "monthly" ? `$${amount}/mo` : `$${amount}/yr`;
}

function getSubscriptionBadgeInfo(
  summary: CompanySubscriptionBillingSummary,
): { label: string; tone: BadgeTone } {
  if (summary.isComped && !summary.hasStripeSubscription) {
    return { label: "Closed beta", tone: "brass" };
  }

  const { status, state, cancelAtPeriodEnd } = summary;

  if (status === "trialing" || state === "TRIAL") {
    return { label: "Trial", tone: "info" };
  }
  if (status === "active") {
    return cancelAtPeriodEnd
      ? { label: "Canceling", tone: "warning" }
      : { label: "Active", tone: "success" };
  }
  if (status === "past_due") {
    return state === "GRACE"
      ? { label: "Grace period", tone: "warning" }
      : { label: "Past due", tone: "danger" };
  }
  if (status === "unpaid") return { label: "Payment required", tone: "danger" };
  if (status === "paused") return { label: "Paused", tone: "warning" };
  if (status === "incomplete") return { label: "Setup incomplete", tone: "warning" };
  if (status === "canceled" || status === "incomplete_expired") {
    return { label: "Canceled", tone: "neutral" };
  }

  if (state === "ACTIVE") return { label: "Active", tone: "success" };
  if (state === "BLOCKED") return { label: "Inactive", tone: "neutral" };
  if (state === "LIMITED") return { label: "Limited", tone: "warning" };
  if (state === "READ_ONLY") return { label: "Read only", tone: "warning" };

  return { label: "Unknown", tone: "neutral" };
}

export function CompanySubscriptionBillingCard({
  summary,
  canManageSubscription = false,
  checkoutConfigured = false,
  northStar = false,
  loadError = null,
}: CompanySubscriptionBillingCardProps) {
  const [actionError, setActionError] = useState<string | null>(null);
  const [planKey, setPlanKey] = useState<SaasCheckoutPlanKey>("starter");
  const [billingInterval, setBillingInterval] =
    useState<SaasBillingInterval>("monthly");
  const [isPending, startTransition] = useTransition();

  const effectiveSummary: CompanySubscriptionBillingSummary = summary ?? {
    planKey: "beta",
    planLabel: SAAS_PLAN_LABELS.beta,
    status: "active",
    state: "ACTIVE",
    isComped: true,
    trialEndsAt: null,
    graceEndsAt: null,
    cancelAtPeriodEnd: false,
    currentPeriodEndsAt: null,
    warnings: [],
    hasStripeSubscription: false,
  };

  const planLabel =
    SAAS_PLAN_LABELS[effectiveSummary.planKey] ?? effectiveSummary.planLabel;
  const trialEndLabel = formatDateLabel(effectiveSummary.trialEndsAt);
  const periodEndLabel = formatDateLabel(effectiveSummary.currentPeriodEndsAt);
  const graceEndLabel = formatDateLabel(effectiveSummary.graceEndsAt);
  const daysLeft = trialDaysRemaining(effectiveSummary.trialEndsAt);

  const hasBlockingSubscription =
    effectiveSummary.hasStripeSubscription &&
    (effectiveSummary.status === "active" ||
      effectiveSummary.status === "trialing" ||
      effectiveSummary.status === "past_due" ||
      effectiveSummary.status === "unpaid" ||
      effectiveSummary.status === "paused");
  const canStartCheckout =
    canManageSubscription && checkoutConfigured && !hasBlockingSubscription;
  const selectedPriceLabel = formatCheckoutPriceLabel(planKey, billingInterval);
  const selectedPlanLabel = SAAS_SUBSCRIPTION_CATALOG[planKey].label;

  const badge = getSubscriptionBadgeInfo(effectiveSummary);

  const isTrialing =
    effectiveSummary.status === "trialing" || effectiveSummary.state === "TRIAL";
  const isActiveNoCancellation =
    effectiveSummary.status === "active" && !effectiveSummary.cancelAtPeriodEnd;
  const isActiveCanceling =
    effectiveSummary.status === "active" && effectiveSummary.cancelAtPeriodEnd;
  const isProblemState =
    effectiveSummary.status === "past_due" ||
    effectiveSummary.status === "unpaid" ||
    effectiveSummary.status === "incomplete" ||
    effectiveSummary.status === "paused";

  // Style classes — northStar variants preserved unchanged
  const surfaceClass = northStar
    ? "rounded-xl border border-[rgba(138,99,36,0.18)] bg-[#FFFCF5] p-4 sm:p-5"
    : "rounded-xl border border-slate-200 bg-white p-4 sm:p-5";
  const titleClass = northStar
    ? "text-base font-semibold text-[#17130E]"
    : "text-base font-semibold text-slate-900";
  const mutedClass = northStar ? "text-sm text-[#4F4638]" : "text-sm text-slate-600";
  const labelClass = northStar
    ? "text-xs font-semibold uppercase tracking-[0.08em] text-[#4F4638]"
    : "text-xs font-semibold uppercase tracking-[0.08em] text-slate-500";
  const valueClass = northStar
    ? "text-sm font-medium text-[#17130E]"
    : "text-sm font-medium text-slate-900";
  const fieldClass = northStar
    ? "mt-1 w-full min-h-10 rounded-lg border border-[rgba(138,99,36,0.22)] bg-white px-3 py-2 text-sm text-[#17130E] focus:outline-none focus:ring-2 focus:ring-[rgba(184,138,46,0.35)]"
    : "mt-1 w-full min-h-10 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-500/40";
  const primaryButtonClass = northStar
    ? "inline-flex min-h-10 items-center justify-center rounded-lg bg-[#B88A2E] px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#9C7424] disabled:opacity-60"
    : "inline-flex min-h-10 items-center justify-center rounded-lg bg-cyan-600 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-cyan-700 disabled:opacity-60";
  const secondaryButtonClass = northStar
    ? "inline-flex min-h-10 items-center justify-center rounded-lg border border-[rgba(138,99,36,0.30)] bg-white px-3 py-2 text-sm font-semibold text-[#9C7424] transition-colors hover:bg-[#FFF3D6] disabled:opacity-60"
    : "inline-flex min-h-10 items-center justify-center rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-60";
  const dividerBorderClass = northStar
    ? "border-[rgba(138,99,36,0.12)]"
    : "border-slate-100";
  const planSectionClass = northStar
    ? "rounded-lg border border-[rgba(138,99,36,0.12)] bg-[#FFFDF8] p-3 sm:p-4"
    : "rounded-lg border border-slate-100 bg-slate-50 p-3 sm:p-4";
  const iconClass = northStar
    ? "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#FFF3D6] text-[#9C7424]"
    : "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-cyan-50 text-cyan-700";

  function handleStartSubscription() {
    setActionError(null);

    if (!canManageSubscription) {
      setActionError("Only owners and admins can start a subscription.");
      return;
    }

    if (!checkoutConfigured) {
      setActionError(
        "Subscription checkout is not configured yet. Contact support to get started.",
      );
      return;
    }

    startTransition(async () => {
      const result = await createSubscriptionCheckoutAction({
        planKey,
        billingInterval,
      });
      if (result.error) {
        setActionError(result.error);
        return;
      }
      if (result.url) {
        window.location.assign(result.url);
      }
    });
  }

  function handleManageBilling() {
    setActionError(null);

    startTransition(async () => {
      const result = await createBillingPortalSessionAction();
      if (result.error) {
        setActionError(result.error);
        return;
      }
      if (result.url) {
        window.location.assign(result.url);
      }
    });
  }

  return (
    <div className={surfaceClass}>
      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <div className={iconClass} aria-hidden>
            <CreditCard className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <h3 className={titleClass}>Company subscription</h3>
            <p className={`mt-0.5 ${mutedClass}`}>
              Altair OS SaaS plan. Customer invoices are managed separately
              under Online payments.
            </p>
          </div>
        </div>
        <span
          className={`${OPERATIONAL_STATUS_BADGE_BASE} ${BADGE_TONE_CLASSES[badge.tone]} mt-0.5 shrink-0`}
          aria-label={`Subscription status: ${badge.label}`}
        >
          {badge.label}
        </span>
      </div>

      {/* ── Load error ─────────────────────────────────────────────── */}
      {loadError ? (
        <p className="mt-3 text-sm text-red-600" role="alert">
          {loadError}
        </p>
      ) : null}

      {/* ── Plan summary ───────────────────────────────────────────── */}
      <div className={`mt-4 ${planSectionClass}`}>
        <p
          className={`text-lg font-semibold leading-tight ${northStar ? "text-[#17130E]" : "text-slate-900"}`}
        >
          {planLabel}
        </p>

        {/* Complimentary / beta access */}
        {effectiveSummary.isComped && !effectiveSummary.hasStripeSubscription ? (
          <p className={`mt-1 ${mutedClass}`}>
            Complimentary access — no billing required.
          </p>
        ) : null}

        {/* Trialing */}
        {isTrialing && trialEndLabel ? (
          <div className="mt-2">
            <p className={mutedClass}>
              Trial ends{" "}
              <span className={valueClass}>{trialEndLabel}</span>
              {daysLeft != null ? (
                <span>
                  {" "}
                  ·{" "}
                  <span
                    className={mutedClass}
                    aria-label={`${daysLeft} ${daysLeft === 1 ? "day" : "days"} remaining`}
                  >
                    {daysLeft} {daysLeft === 1 ? "day" : "days"} remaining
                  </span>
                </span>
              ) : null}
            </p>
            <p
              className={`mt-1 text-xs ${northStar ? "text-[#64748b]" : "text-slate-400"}`}
            >
              Billing begins after the trial period ends.
            </p>
          </div>
        ) : null}

        {/* Active — renewal */}
        {isActiveNoCancellation && periodEndLabel ? (
          <p className={`mt-2 ${mutedClass}`}>
            Renews on <span className={valueClass}>{periodEndLabel}</span>
          </p>
        ) : null}

        {/* Active — scheduled cancellation */}
        {isActiveCanceling && periodEndLabel ? (
          <div
            className={`mt-2 rounded-md border px-3 py-2 ${
              northStar
                ? "border-[rgba(217,119,6,0.20)] bg-[#FFFBEB]"
                : "border-amber-200 bg-amber-50"
            }`}
          >
            <p
              className={`text-sm font-medium ${northStar ? "text-[#9f5704]" : "text-amber-800"}`}
            >
              Scheduled to end on {periodEndLabel}
            </p>
            <p
              className={`mt-0.5 text-xs ${northStar ? "text-[#9f5704]" : "text-amber-700"}`}
            >
              You will retain access through the end of the current billing
              period.
            </p>
          </div>
        ) : null}
      </div>

      {/* ── Payment problem ────────────────────────────────────────── */}
      {isProblemState ? (
        <div
          className={`mt-3 rounded-lg border px-3 py-2.5 ${
            northStar
              ? "border-[rgba(220,38,38,0.15)] bg-[#FFF1F2]"
              : "border-red-100 bg-red-50"
          }`}
          role="alert"
        >
          <p
            className={`text-sm font-medium ${northStar ? "text-[#d32222]" : "text-red-700"}`}
          >
            Payment action required
          </p>
          <p
            className={`mt-0.5 text-xs ${northStar ? "text-[#d32222]" : "text-red-600"}`}
          >
            {effectiveSummary.status === "past_due" ||
            effectiveSummary.status === "unpaid"
              ? "Update your payment method to keep your subscription in good standing."
              : effectiveSummary.status === "incomplete"
                ? "Your subscription setup was not completed. Update your payment method to activate."
                : "Your subscription is paused. Update your payment method to resume access."}
          </p>
          {graceEndLabel && effectiveSummary.state === "GRACE" ? (
            <p
              className={`mt-1 text-xs ${northStar ? "text-[#9f5704]" : "text-amber-700"}`}
            >
              Grace period ends {graceEndLabel}.
            </p>
          ) : null}
        </div>
      ) : null}

      {/* ── Action error ───────────────────────────────────────────── */}
      {actionError ? (
        <p className="mt-3 text-sm text-red-600" role="alert">
          {actionError}
        </p>
      ) : null}

      {/* ── Actions ────────────────────────────────────────────────── */}
      {canManageSubscription ? (
        <div className="mt-4 flex flex-col gap-3">
          {/* Start-trial checkout form */}
          {canStartCheckout ? (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="min-w-0 block">
                  <span className={labelClass}>Plan</span>
                  <select
                    className={fieldClass}
                    value={planKey}
                    disabled={isPending}
                    onChange={(event) =>
                      setPlanKey(event.target.value as SaasCheckoutPlanKey)
                    }
                  >
                    {SAAS_CHECKOUT_PLAN_KEYS.map((key) => (
                      <option key={key} value={key}>
                        {SAAS_SUBSCRIPTION_CATALOG[key].label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="min-w-0 block">
                  <span className={labelClass}>Billing</span>
                  <select
                    className={fieldClass}
                    value={billingInterval}
                    disabled={isPending}
                    onChange={(event) =>
                      setBillingInterval(
                        event.target.value as SaasBillingInterval,
                      )
                    }
                  >
                    {SAAS_BILLING_INTERVALS.map((interval) => (
                      <option key={interval} value={interval}>
                        {INTERVAL_LABELS[interval]}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <p className={mutedClass}>
                {selectedPlanLabel} · {selectedPriceLabel} ·{" "}
                {SAAS_TRIAL_CONFIG.durationDays}-day trial, card required.
                Converts to paid billing unless canceled.
              </p>
              <button
                type="button"
                className={primaryButtonClass}
                disabled={isPending}
                onClick={handleStartSubscription}
              >
                {isPending
                  ? "Starting…"
                  : `Start ${SAAS_TRIAL_CONFIG.durationDays}-day trial`}
              </button>
            </>
          ) : null}

          {/* Manage billing */}
          {effectiveSummary.hasStripeSubscription ? (
            <button
              type="button"
              className={
                isProblemState && !canStartCheckout
                  ? primaryButtonClass
                  : secondaryButtonClass
              }
              disabled={isPending}
              onClick={handleManageBilling}
              aria-label="Manage billing in Stripe portal"
            >
              {isPending ? "Opening…" : "Manage billing"}
            </button>
          ) : null}
        </div>
      ) : (
        <p className={`mt-4 ${mutedClass}`}>
          Subscription changes are limited to owner and admin roles.
        </p>
      )}

      {/* ── Portal explanation ─────────────────────────────────────── */}
      {canManageSubscription && effectiveSummary.hasStripeSubscription ? (
        <p
          className={`mt-3 border-t pt-3 text-xs ${dividerBorderClass} ${northStar ? "text-[#64748b]" : "text-slate-400"}`}
        >
          Manage payment methods, billing information, and subscription
          invoices securely through Stripe.
        </p>
      ) : null}
    </div>
  );
}
