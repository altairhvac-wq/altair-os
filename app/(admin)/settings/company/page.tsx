import {
  canAccessCompanySettings,
  canManageDemoData,
} from "@/lib/database/access-control";
import { getActiveCompanyContext } from "@/lib/database/company-context";
import { getDemoDataStatusSafe } from "@/lib/database/queries/demo-data";
import { listCompanyMembers } from "@/lib/database/queries/memberships";
import { CompanySettingsView } from "@/shared/components/settings/CompanySettingsView";
import type { DemoDataStatus } from "@/shared/types/demo-data";
import type { CompanyProfileSummary } from "@/shared/types/team-member";

async function loadDemoDataStatus(
  companyContext: NonNullable<
    Awaited<ReturnType<typeof getActiveCompanyContext>>
  >,
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
  const company = companyContext.company;
  const companyProfile: CompanyProfileSummary = {
    id: company.id,
    name: company.name,
    status: company.status,
    trade: company.trade,
    timezone: company.timezone,
    email: company.email,
    phone: company.phone,
    addressLine1: company.address_line1,
    addressLine2: company.address_line2,
    city: company.city,
    state: company.state,
    postalCode: company.postal_code,
    country: company.country,
    memberCount: members.length,
    currentUserRole: companyContext.role,
  };

  return (
    <CompanySettingsView
      companyProfile={companyProfile}
      canManage={canAccessCompanySettings(companyContext)}
      demoDataStatus={demoDataResult.status ?? undefined}
      demoDataLoadError={demoDataResult.error}
    />
  );
}
