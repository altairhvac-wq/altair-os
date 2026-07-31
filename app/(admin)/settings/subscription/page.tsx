import { isNorthStarShellEnabled } from "@/lib/beta/north-star-shell";
import { getActiveCompanyContext } from "@/lib/database/company-context";
import {
  getCompanySubscriptionBillingSummary,
  isSaasBillingCheckoutConfigured,
  type CompanySubscriptionBillingSummary,
} from "@/lib/saas-billing";
import { CompanySubscriptionBillingCard } from "@/shared/components/settings/CompanySubscriptionBillingCard";
import {
  SettingsWorkspacePage,
  SettingsWorkspaceSection,
} from "@/shared/components/settings/SettingsWorkspacePage";

async function loadSubscriptionBillingSafely(
  companyId: string,
): Promise<{
  summary: CompanySubscriptionBillingSummary | null;
  error?: string;
}> {
  try {
    return {
      summary: await getCompanySubscriptionBillingSummary(companyId),
    };
  } catch (error) {
    console.error("[SubscriptionSettingsPage] billing load failed:", error);
    return {
      summary: null,
      error:
        "We couldn't load subscription status. Refresh the page or try again in a moment.",
    };
  }
}

export default async function SubscriptionSettingsPage() {
  const companyContext = await getActiveCompanyContext();

  if (!companyContext) {
    return null;
  }

  const billingResult = await loadSubscriptionBillingSafely(
    companyContext.company.id,
  );
  const northStar = isNorthStarShellEnabled();

  return (
    <SettingsWorkspacePage
      title="Altair Subscription"
      description="Manage your Altair plan, trial, billing portal, and subscription invoices."
      northStar={northStar}
    >
      <SettingsWorkspaceSection
        title="Plan and billing"
        description="Subscription billing for Altair OS is separate from customer payment collection."
        northStar={northStar}
      >
        <CompanySubscriptionBillingCard
          summary={billingResult.summary}
          canManageSubscription={companyContext.permissions.manageCompany}
          checkoutConfigured={isSaasBillingCheckoutConfigured()}
          loadError={billingResult.error ?? null}
          northStar={northStar}
        />
      </SettingsWorkspaceSection>
    </SettingsWorkspacePage>
  );
}
