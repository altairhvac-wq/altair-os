import { logoutAction } from "@/app/actions/auth";
import type { CompanySubscriptionBillingSummary } from "@/lib/saas-billing/types";
import { CompanySubscriptionBillingCard } from "@/shared/components/settings/CompanySubscriptionBillingCard";
import { buttonClassName } from "@/shared/design-system/components/button-styles";
import { AltairLogo } from "@/shared/components/brand/AltairLogo";

type ActivateSubscriptionViewProps = {
  companyName: string;
  summary: CompanySubscriptionBillingSummary | null;
  canManageSubscription: boolean;
  checkoutConfigured: boolean;
  loadError?: string | null;
  notice?: {
    tone: "info" | "warning" | "error" | "success";
    message: string;
  } | null;
};

const NOTICE_CLASSES = {
  info: "border-altair-information/25 bg-altair-information-surface text-altair-information-foreground",
  warning:
    "border-altair-warning/25 bg-altair-warning-surface text-altair-warning-foreground",
  error: "border-altair-danger/25 bg-altair-danger-surface text-altair-danger-foreground",
  success:
    "border-altair-success/25 bg-altair-success-surface text-altair-success-foreground",
} as const;

export function ActivateSubscriptionView({
  companyName,
  summary,
  canManageSubscription,
  checkoutConfigured,
  loadError = null,
  notice = null,
}: ActivateSubscriptionViewProps) {
  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#F7F4EE_0%,#F3EFE6_45%,#EFE9DE_100%)]">
      <div className="mx-auto flex min-h-screen w-full max-w-3xl flex-col px-4 py-8 sm:px-6 sm:py-10">
        <header className="flex items-start justify-between gap-4">
          <div>
            <AltairLogo variant="primary" size="md" showWordmark />
            <p className="mt-3 text-sm text-altair-ink-secondary">
              Activate billing for <span className="font-medium text-altair-ink">{companyName}</span>
            </p>
          </div>
          <form action={logoutAction}>
            <button type="submit" className={buttonClassName("secondary", "sm")}>
              Sign out
            </button>
          </form>
        </header>

        <main className="mt-8 space-y-5">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-altair-ink sm:text-[1.75rem]">
              Start your Altair subscription
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-altair-ink-secondary">
              Choose a plan and enter a payment method to begin your 14-day trial.
              Full application access unlocks after Stripe confirms an active or
              trialing subscription.
            </p>
          </div>

          {notice ? (
            <div
              className={`rounded-xl border px-4 py-3 text-sm ${NOTICE_CLASSES[notice.tone]}`}
              role="status"
            >
              {notice.message}
            </div>
          ) : null}

          <CompanySubscriptionBillingCard
            summary={summary}
            canManageSubscription={canManageSubscription}
            checkoutConfigured={checkoutConfigured}
            loadError={loadError}
          />

          {!canManageSubscription ? (
            <p className="text-sm text-altair-ink-secondary">
              Only owners and admins can start billing. Ask a company owner to
              activate the subscription, then sign in again.
            </p>
          ) : null}
        </main>
      </div>
    </div>
  );
}
