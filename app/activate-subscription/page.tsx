import { redirect } from "next/navigation";
import { resolvePostLoginRedirect } from "@/lib/auth/redirects";
import { getCurrentUser } from "@/lib/database/auth";
import { getActiveCompanyContext } from "@/lib/database/company-context";
import {
  companyHasFullApplicationAccess,
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

  if (
    companyHasFullApplicationAccess({
      status: access.status,
      isComped: access.isComped,
    })
  ) {
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
        "Checkout was canceled. Your workspace stays locked until a trial or paid subscription is started.",
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
