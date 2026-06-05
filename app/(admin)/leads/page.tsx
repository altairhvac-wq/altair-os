import { redirect } from "next/navigation";
import { isAiFeaturesEnabled } from "@/lib/ai/env";
import { getActiveCompanyContext } from "@/lib/database/company-context";
import { listLeadActivitiesForLead } from "@/lib/database/queries/lead-activities";
import {
  listLeadAssignableMembers,
  listLeads,
} from "@/lib/database/queries/leads";
import { LeadsPageView } from "@/shared/components/leads/LeadsPageView";
import { UnauthorizedAccessView } from "@/shared/components/layout/UnauthorizedAccessView";

type LeadsPageProps = {
  searchParams: Promise<{
    selected?: string;
    create?: string;
  }>;
};

export default async function LeadsPage({ searchParams }: LeadsPageProps) {
  const companyContext = await getActiveCompanyContext();

  if (!companyContext) {
    redirect("/setup");
  }

  if (!companyContext.permissions.manageCustomers) {
    return (
      <UnauthorizedAccessView description="Lead records are limited to office and dispatch roles." />
    );
  }

  const { selected, create } = await searchParams;

  const [leads, assignableMembers] = await Promise.all([
    listLeads(companyContext.company.id),
    listLeadAssignableMembers(companyContext.company.id),
  ]);

  const selectedLeadId =
    selected && leads.some((lead) => lead.id === selected) ? selected : undefined;

  const activitiesByLeadId: Record<string, Awaited<ReturnType<typeof listLeadActivitiesForLead>>> =
    {};

  if (selectedLeadId) {
    activitiesByLeadId[selectedLeadId] = await listLeadActivitiesForLead(
      companyContext.company.id,
      selectedLeadId,
    );
  }

  return (
    <LeadsPageView
      initialLeads={leads}
      activitiesByLeadId={activitiesByLeadId}
      assignableMembers={assignableMembers}
      aiFeaturesEnabled={isAiFeaturesEnabled()}
      initialSelectedId={selectedLeadId}
      initialCreate={create === "1"}
    />
  );
}
