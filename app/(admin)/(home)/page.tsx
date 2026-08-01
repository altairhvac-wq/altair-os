import { redirect } from "next/navigation";
import { shouldUseTechnicianHome } from "@/lib/auth/redirects";
import { canManageDemoData } from "@/lib/database/access-control";
import { getActiveCompanyContext } from "@/lib/database/company-context";
import { getDemoDataStatus } from "@/lib/database/queries/demo-data";
import { getDashboardKpiStripData } from "@/lib/database/queries/dashboard-kpi-strip";
import { getOnboardingSnapshot } from "@/lib/database/queries/onboarding-snapshot";
import { getDashboardData } from "@/lib/database/services/dashboard";
import { getRequestCompanyBillingAccess } from "@/lib/saas-billing/request-access";
import { OperationalDashboardView } from "@/shared/components/dashboard/OperationalDashboardView";
import { buildMissionControlV2KpiCards } from "@/shared/lib/dashboard-mission-control-v2-kpi-strip";
import { buildOnboardingChecklist, filterOnboardingChecklistForContext } from "@/shared/lib/onboarding-checklist";

export default async function DashboardPage() {
  const companyContext = await getActiveCompanyContext();

  if (!companyContext) {
    redirect("/setup");
  }

  if (shouldUseTechnicianHome(companyContext)) {
    redirect("/technician");
  }

  const companyId = companyContext.company.id;

  const [data, onboardingSnapshot, demoDataStatus, billingAccess, kpiStrip] =
    await Promise.all([
      getDashboardData(companyContext),
      getOnboardingSnapshot(companyId, companyContext),
      canManageDemoData(companyContext)
        ? getDemoDataStatus(companyId, companyContext)
        : Promise.resolve(null),
      getRequestCompanyBillingAccess(companyId),
      getDashboardKpiStripData(companyId, companyContext.company.timezone),
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
    <OperationalDashboardView
      data={data}
      userDisplayName={userDisplayName}
      onboardingChecklist={onboardingChecklist}
      demoDataStatus={demoDataStatus}
      companyName={companyContext.company.name}
      companyTimeZone={companyContext.company.timezone}
      billingAccess={billingAccess}
      kpiCards={buildMissionControlV2KpiCards(kpiStrip)}
    />
  );
}
