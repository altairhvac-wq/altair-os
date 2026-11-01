import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { resolvePostLoginRedirect } from "@/lib/auth/redirects";
import { getCurrentUser } from "@/lib/database/auth";
import { getActiveCompanyContext } from "@/lib/database/company-context";
import {
  billingPolicyAllowsAppShell,
  getCompanySubscriptionBillingSummary,
  isSaasBillingCheckoutConfigured,
  reconcileCheckoutSessionForCompany,
  resolveCompanyBillingAccess,
  type CompanySubscriptionBillingSummary,
} from "@/lib/saas-billing";
import { ActivateSubscriptionView } from "@/shared/components/billing/ActivateSubscriptionView";

type ActivateSubscriptionPageProps = {
  searchParams: Promise<{
    billing?: string;
    session_id?: string;
  }>;
};

async function loadSummarySafely(companyId: string): Promise<{
  summary: CompanySubscriptionBillingSummary | null;
  error?: string;
}> {
  try {
    return {
      summary: await getCompanySubscriptionBillingSummary(companyId),
    };
  } catch (error) {
    console.error("[ActivateSubscriptionPage] billing load failed:", {
      companyId,
      message: error instanceof Error ? error.message : "unknown",
    });
    return {
      summary: null,
      error:
        "We couldn't load subscription status. Refresh the page or try again in a moment.",
    };
  }
}

export const metadata: Metadata = {
  title: "Activate subscription",
};

export default async function ActivateSubscriptionPage({
  searchParams,
}: ActivateSubscriptionPageProps) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login?next=/activate-subscription");
  }

  const companyContext = await getActiveCompanyContext();

  if (!companyContext) {
    redirect("/setup");
  }

  const companyId = companyContext.company.id;
  const params = await searchParams;
  const billing = params.billing?.trim() || null;
  const sessionId = params.session_id?.trim() || null;

  let notice: {
    tone: "info" | "warning" | "error" | "success";
    message: string;
  } | null = null;

  const access = await resolveCompanyBillingAccess(companyId);

  // Same rule as the app shells, so the two pages can never disagree about
  // whether a company belongs here or on the dashboard. A past_due company
  // inside its grace window is sent back to work; it updates the card from
  // Settings → Subscription.
  if (billingPolicyAllowsAppShell(access)) {
    redirect(resolvePostLoginRedirect(companyContext, null));
  }

  if (billing === "success") {
    if (!sessionId) {
      notice = {
        tone: "warning",
        message:
          "Checkout finished, but activation is still pending. Refresh this page in a moment, or restart checkout if access does not unlock.",
      };
      console.info("[saas-billing] activate page success without session_id", {
        companyId,
      });
    } else {
      const reconcile = await reconcileCheckoutSessionForCompany({
        companyId,
        checkoutSessionId: sessionId,
      });

      if (reconcile.ok && reconcile.unlocked) {
        redirect(resolvePostLoginRedirect(companyContext, null));
      }

      // The reconcile can activate the row without reporting `unlocked`
      // (observed in the trial walk: the subscription was already active
      // while this page still said "waiting"). Re-read access once; if the
      // app shell is allowed now, go there instead of asking for a refresh.
      if (reconcile.ok) {
        const refreshed = await resolveCompanyBillingAccess(companyId);
        if (billingPolicyAllowsAppShell(refreshed)) {
          redirect(resolvePostLoginRedirect(companyContext, null));
        }
      }

      if (reconcile.ok) {
        notice = {
          tone: "info",
          message:
            "Checkout was verified. Waiting for Stripe to report an active or trialing subscription. You can refresh this page shortly.",
        };
      } else {
        notice = {
          tone: "error",
          message: reconcile.error,
        };
      }
    }
  } else if (billing === "cancel") {
    notice = {
      tone: "warning",
      message:
        "Checkout was canceled. Your workspace stays paused until a payment method is added.",
    };
  }

  const billingResult = await loadSummarySafely(companyId);

  return (
    <ActivateSubscriptionView
      companyName={companyContext.company.name}
      summary={billingResult.summary}
      canManageSubscription={companyContext.permissions.manageCompany}
      checkoutConfigured={isSaasBillingCheckoutConfigured()}
      loadError={billingResult.error ?? null}
      notice={notice}
    />
  );
}
