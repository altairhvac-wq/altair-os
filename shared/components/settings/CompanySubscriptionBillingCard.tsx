"use client";

import { CreditCard } from "lucide-react";
import { useState, useTransition } from "react";
import { createSubscriptionCheckoutAction } from "@/app/actions/saas-billing";
import type { CompanySubscriptionBillingSummary } from "@/lib/saas-billing/types";
import { SAAS_PLAN_LABELS } from "@/shared/lib/saas-billing-labels";

type CompanySubscriptionBillingCardProps = {
  summary: CompanySubscriptionBillingSummary | null;
  canManageSubscription?: boolean;
  checkoutConfigured?: boolean;
  northStar?: boolean;
  loadError?: string | null;
};

const STATE_LABELS: Record<CompanySubscriptionBillingSummary["state"], string> = {
  ACTIVE: "Active",
  TRIAL: "Trial",
  GRACE: "Grace period",
  LIMITED: "Limited",
  READ_ONLY: "Read only",
  BLOCKED: "Blocked",
};

function formatDateLabel(value: string | null): string | null {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function CompanySubscriptionBillingCard({
  summary,
  canManageSubscription = false,
  checkoutConfigured = false,
  northStar = false,
  loadError = null,
}: CompanySubscriptionBillingCardProps) {
  const [actionError, setActionError] = useState<string | null>(null);
  const [comingSoonMessage, setComingSoonMessage] = useState<string | null>(null);
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
  const trialLabel = formatDateLabel(effectiveSummary.trialEndsAt);
  const hasBlockingSubscription =
    effectiveSummary.hasStripeSubscription &&
    (effectiveSummary.status === "active" ||
      effectiveSummary.status === "trialing" ||
      effectiveSummary.status === "past_due" ||
      effectiveSummary.status === "unpaid" ||
      effectiveSummary.status === "paused");
  const canStartCheckout =
    canManageSubscription && checkoutConfigured && !hasBlockingSubscription;
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
  const primaryButtonClass = northStar
    ? "inline-flex min-h-10 items-center justify-center rounded-lg bg-[#B88A2E] px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#9C7424] disabled:opacity-60"
    : "inline-flex min-h-10 items-center justify-center rounded-lg bg-cyan-600 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-cyan-700 disabled:opacity-60";
  const secondaryButtonClass = northStar
    ? "inline-flex min-h-10 items-center justify-center rounded-lg border border-[rgba(138,99,36,0.28)] bg-white px-3 py-2 text-sm font-semibold text-[#17130E] transition-colors hover:bg-[#FFF9EA] disabled:opacity-60"
    : "inline-flex min-h-10 items-center justify-center rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 transition-colors hover:bg-slate-50 disabled:opacity-60";

  function handleManageSubscription() {
    setActionError(null);
    setComingSoonMessage(
      "Billing Portal management is coming soon. Contact support to change payment methods.",
    );
  }

  function handleStartSubscription() {
    setActionError(null);
    setComingSoonMessage(null);

    if (!canManageSubscription) {
      setActionError("Only owners and admins can start a subscription.");
      return;
    }

    if (!checkoutConfigured) {
      setComingSoonMessage(
        "Subscription checkout is coming soon. Price configuration is not available yet.",
      );
      return;
    }

    startTransition(async () => {
      const result = await createSubscriptionCheckoutAction("starter");
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
      <div className="flex items-start gap-3">
        <div
          className={
            northStar
              ? "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#FFF3D6] text-[#9C7424]"
              : "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-cyan-50 text-cyan-700"
          }
        >
          <CreditCard className="h-5 w-5" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className={titleClass}>Company subscription</h3>
          <p className={`mt-1 ${mutedClass}`}>
            Altair OS SaaS plan for this company. Customer invoice payments stay
            under Online payments.
          </p>
        </div>
      </div>

      {loadError ? (
        <p className="mt-4 text-sm text-red-600" role="alert">
          {loadError}
        </p>
      ) : null}

      <dl className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="min-w-0">
          <dt className={labelClass}>Current plan</dt>
          <dd className={`mt-1 ${valueClass}`}>{planLabel}</dd>
        </div>
        <div className="min-w-0">
          <dt className={labelClass}>Subscription state</dt>
          <dd className={`mt-1 ${valueClass}`}>
            {STATE_LABELS[effectiveSummary.state]}
          </dd>
        </div>
        <div className="min-w-0">
          <dt className={labelClass}>Trial status</dt>
          <dd className={`mt-1 ${valueClass}`}>
            {effectiveSummary.state === "TRIAL" && trialLabel
              ? `Trial ends ${trialLabel}`
              : trialLabel
                ? `Trial ends ${trialLabel}`
                : "No active trial"}
          </dd>
        </div>
        <div className="min-w-0">
          <dt className={labelClass}>Access</dt>
          <dd className="mt-1">
            {effectiveSummary.isComped ? (
              <span
                className={
                  northStar
                    ? "inline-flex items-center rounded-md bg-[#FFF3D6] px-2 py-1 text-xs font-semibold text-[#9C7424]"
                    : "inline-flex items-center rounded-md bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700"
                }
              >
                Beta complimentary
              </span>
            ) : (
              <span className={valueClass}>Paid subscription</span>
            )}
          </dd>
        </div>
      </dl>

      {effectiveSummary.warnings.length > 0 ? (
        <ul className={`mt-3 list-disc space-y-1 pl-5 ${mutedClass}`}>
          {effectiveSummary.warnings.map((warning) => (
            <li key={warning}>{warning}</li>
          ))}
        </ul>
      ) : null}

      {actionError ? (
        <p className="mt-3 text-sm text-red-600" role="alert">
          {actionError}
        </p>
      ) : null}

      {comingSoonMessage ? (
        <p className={`mt-3 ${mutedClass}`} role="status">
          {comingSoonMessage}
        </p>
      ) : null}

      {canManageSubscription ? (
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          {canStartCheckout ? (
            <button
              type="button"
              className={primaryButtonClass}
              disabled={isPending}
              onClick={handleStartSubscription}
            >
              {isPending ? "Starting…" : "Start subscription"}
            </button>
          ) : null}
          <button
            type="button"
            className={
              canStartCheckout ? secondaryButtonClass : primaryButtonClass
            }
            disabled={isPending}
            onClick={handleManageSubscription}
          >
            Manage subscription
          </button>
        </div>
      ) : (
        <p className={`mt-4 ${mutedClass}`}>
          Subscription changes are limited to owner and admin roles.
        </p>
      )}
    </div>
  );
}
