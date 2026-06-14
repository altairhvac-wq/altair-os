import { redirect } from "next/navigation";
import { isAiDraftingConfigured, isAiFeaturesEnabled } from "@/lib/ai/env";
import { getActiveCompanyContext } from "@/lib/database/company-context";
import { listLeadActivitiesForLead } from "@/lib/database/queries/lead-activities";
import {
  listLeadAssignableMembers,
  listLeadsWithReferrals,
} from "@/lib/database/queries/leads";
import { LeadsPageView } from "@/shared/components/leads/LeadsPageView";
import { UnauthorizedAccessView } from "@/shared/components/layout/UnauthorizedAccessView";
import type { LeadStatus } from "@/shared/types/lead";

const LEAD_STATUS_FILTERS = new Set<LeadStatus>([
  "new",
  "contacted",
  "scheduled",
  "estimate_sent",
  "won",
  "lost",
]);

type LeadsPageProps = {
  searchParams: Promise<{
    selected?: string;
    create?: string;
    status?: string;
    filter?: string;
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

  const { selected, create, status, filter } = await searchParams;
  const initialStatusFilter =
    status && LEAD_STATUS_FILTERS.has(status as LeadStatus)
      ? (status as LeadStatus)
      : undefined;
  const initialFollowUpDue = filter === "follow_up_due";

  const [leads, assignableMembers] = await Promise.all([
    listLeadsWithReferrals(companyContext.company.id),
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
      aiDraftingConfigured={isAiDraftingConfigured()}
      initialSelectedId={selectedLeadId}
      initialCreate={create === "1"}
      initialStatusFilter={initialStatusFilter}
      initialFollowUpDue={initialFollowUpDue}
    />
  );
}
