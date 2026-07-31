import { canManageDemoData } from "@/lib/database/access-control";
import { getActiveCompanyContext } from "@/lib/database/company-context";
import { getDemoDataStatusSafe } from "@/lib/database/queries/demo-data";
import { listCompanyMembers } from "@/lib/database/queries/memberships";
import { isNorthStarShellEnabled } from "@/lib/beta/north-star-shell";
import { CompanySettingsView } from "@/shared/components/settings/CompanySettingsView";
import type { DemoDataStatus } from "@/shared/types/demo-data";
import type { CompanyProfileSummary } from "@/shared/types/team-member";

async function loadDemoDataStatus(
  companyContext: NonNullable<Awaited<ReturnType<typeof getActiveCompanyContext>>>,
): Promise<{ status: DemoDataStatus | null; error?: string }> {
  if (!canManageDemoData(companyContext)) {
    return { status: null };
  }

  return getDemoDataStatusSafe(companyContext.company.id, companyContext);
}

export default async function CompanySettingsPage() {
  const companyContext = await getActiveCompanyContext();

  if (!companyContext) {
    return null;
  }

  const [{ members }, demoDataResult] = await Promise.all([
    listCompanyMembers(companyContext.company.id, companyContext),
    loadDemoDataStatus(companyContext),
  ]);
  const companyProfile: CompanyProfileSummary = {
    id: companyContext.company.id,
    name: companyContext.company.name,
    status: companyContext.company.status,
    timezone: companyContext.company.timezone,
    email: companyContext.company.email,
    phone: companyContext.company.phone,
    city: companyContext.company.city,
    state: companyContext.company.state,
    memberCount: members.length,
    currentUserRole: companyContext.role,
  };

  return (
    <CompanySettingsView
      companyProfile={companyProfile}
      demoDataStatus={demoDataResult.status ?? undefined}
      demoDataLoadError={demoDataResult.error}
      northStar={isNorthStarShellEnabled()}
    />
  );
}
