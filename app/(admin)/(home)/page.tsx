import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { shouldUseTechnicianHome } from "@/lib/auth/redirects";
import { canManageDemoData } from "@/lib/database/access-control";
import { getActiveCompanyContext } from "@/lib/database/company-context";
import { getDemoDataStatus } from "@/lib/database/queries/demo-data";
import { getOnboardingSnapshot } from "@/lib/database/queries/onboarding-snapshot";
import { getDashboardData } from "@/lib/database/services/dashboard";
import { getRequestCompanyBillingAccess } from "@/lib/saas-billing/request-access";
import { BillingGraceBanner } from "@/shared/components/billing/BillingGraceBanner";
import { OperationalDashboardView } from "@/shared/components/dashboard/OperationalDashboardView";
import { buildOnboardingChecklist, filterOnboardingChecklistForContext } from "@/shared/lib/onboarding-checklist";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default async function DashboardPage() {
  const companyContext = await getActiveCompanyContext();

  if (!companyContext) {
    redirect("/setup");
  }

  if (shouldUseTechnicianHome(companyContext)) {
    redirect("/technician");
  }

  const companyId = companyContext.company.id;

  const [data, onboardingSnapshot, demoDataStatus, billingAccess] =
    await Promise.all([
      getDashboardData(companyContext),
      getOnboardingSnapshot(companyId, companyContext),
      canManageDemoData(companyContext)
        ? getDemoDataStatus(companyId, companyContext)
        : Promise.resolve(null),
      // Request-cached: the admin layout already resolved it for the gate.
      getRequestCompanyBillingAccess(companyId),
    ]);

  const onboardingChecklist = filterOnboardingChecklistForContext(
    buildOnboardingChecklist(onboardingSnapshot),
    companyContext,
  );

  const userDisplayName =
    companyContext.profile.full_name ??
    companyContext.user.email ??
    "User";

  return (
    <>
      {/* Renders only while a failed payment is inside its grace window. */}
      <BillingGraceBanner
        access={billingAccess}
        timeZone={companyContext.company.timezone}
        className="mx-4 mt-4 md:mx-6 md:mt-6"
      />
      <OperationalDashboardView
        data={data}
        userDisplayName={userDisplayName}
        onboardingChecklist={onboardingChecklist}
        demoDataStatus={demoDataStatus}
        companyTimeZone={companyContext.company.timezone}
        companyContext={companyContext}
      />
    </>
  );
}
