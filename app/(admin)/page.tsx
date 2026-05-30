import { redirect } from "next/navigation";
import { shouldUseTechnicianHome } from "@/lib/auth/redirects";
import { canManageDemoData } from "@/lib/database/access-control";
import { getActiveCompanyContext } from "@/lib/database/company-context";
import { getDemoDataStatus } from "@/lib/database/queries/demo-data";
import { getOnboardingSnapshot } from "@/lib/database/queries/onboarding-snapshot";
import { getDashboardData } from "@/lib/database/services/dashboard";
import { OperationalDashboardView } from "@/shared/components/dashboard/OperationalDashboardView";
import { buildOnboardingChecklist, filterOnboardingChecklistForContext } from "@/shared/lib/onboarding-checklist";

export default async function DashboardPage() {
  const companyContext = await getActiveCompanyContext();

  if (!companyContext) {
    redirect("/setup");
  }

  if (shouldUseTechnicianHome(companyContext)) {
    redirect("/technician");
  }

  const [data, onboardingSnapshot, demoDataStatus] = await Promise.all([
    getDashboardData(companyContext),
    getOnboardingSnapshot(companyContext.company.id, companyContext),
    canManageDemoData(companyContext)
      ? getDemoDataStatus(companyContext.company.id, companyContext)
      : Promise.resolve(null),
  ]);

  const onboardingChecklist = filterOnboardingChecklistForContext(
    buildOnboardingChecklist(onboardingSnapshot),
    companyContext,
  );

  return (
    <OperationalDashboardView
      data={data}
      onboardingChecklist={onboardingChecklist}
      companyId={companyContext.company.id}
      userId={companyContext.user.id}
      demoDataStatus={demoDataStatus}
    />
  );
}
