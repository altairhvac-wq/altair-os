import { redirect } from "next/navigation";
import { isAiDraftingConfigured, isAiFeaturesEnabled } from "@/lib/ai/env";
import { canViewBilling, getCompanyAccessScope } from "@/lib/database/access-control";
import { getActiveCompanyContext } from "@/lib/database/company-context";
import {
  applyCustomerOperationalStats,
  listCustomers,
  listCustomerOperationalStatsByCompany,
  listDeletedCustomers,
} from "@/lib/database/queries/customers";
import { listLeadActivitiesForLead } from "@/lib/database/queries/lead-activities";
import {
  listLeadAssignableMembers,
  listLeadsWithReferrals,
} from "@/lib/database/queries/leads";
import { ensureInvoiceBillingStatesSynced } from "@/lib/database/services/invoice-billing";
import { CustomersHubPageView } from "@/shared/components/customers/CustomersHubPageView";
import { UnauthorizedAccessView } from "@/shared/components/layout/UnauthorizedAccessView";
import { resolveCustomersHubTab } from "@/shared/lib/customers/customers-hub";

type CustomersPageProps = {
  searchParams: Promise<{
    tab?: string;
    selected?: string;
    create?: string;
    status?: string;
    filter?: string;
    queue?: string;
  }>;
};

export default async function CustomersPage({ searchParams }: CustomersPageProps) {
  const companyContext = await getActiveCompanyContext();

  if (!companyContext) {
    redirect("/setup");
  }

  if (!getCompanyAccessScope(companyContext).canManageCustomers) {
    return (
      <UnauthorizedAccessView description="Customer records are limited to office and dispatch roles." />
    );
  }

  const params = await searchParams;
  const activeTab = resolveCustomersHubTab(params.tab);
  const canViewCustomerBilling = canViewBilling(companyContext);
  const companyTimeZone = companyContext.company.timezone;

  // Sync overdue invoice statuses before the ops-stats invoice pass so Past Due
  // matches Invoices page read behavior (Customers previously skipped this).
  if (canViewCustomerBilling) {
    await ensureInvoiceBillingStatesSynced(
      companyContext.company.id,
      companyTimeZone,
    );
  }

  const [customers, deletedCustomers, operationalStatsByCustomer, leads, assignableMembers] =
    await Promise.all([
      listCustomers(companyContext.company.id, {
        includeArchived: true,
      }),
      listDeletedCustomers(companyContext.company.id),
      listCustomerOperationalStatsByCompany(companyContext.company.id),
      listLeadsWithReferrals(companyContext.company.id),
      listLeadAssignableMembers(companyContext.company.id),
    ]);

  const visibleCustomers = applyCustomerOperationalStats(
    [...customers, ...deletedCustomers],
    operationalStatsByCustomer,
    { includeRevenue: canViewCustomerBilling },
  );

  const selectedLeadId =
    params.selected && leads.some((lead) => lead.id === params.selected)
      ? params.selected
      : undefined;

  const activitiesByLeadId: Record<
    string,
    Awaited<ReturnType<typeof listLeadActivitiesForLead>>
  > = {};

  if (selectedLeadId && activeTab === "pipeline") {
    activitiesByLeadId[selectedLeadId] = await listLeadActivitiesForLead(
      companyContext.company.id,
      selectedLeadId,
    );
  }

  return (
    <CustomersHubPageView
      initialCustomers={visibleCustomers}
      canManageCustomers={companyContext.permissions.manageCustomers}
      initialLeads={leads}
      activitiesByLeadId={activitiesByLeadId}
      assignableMembers={assignableMembers}
      aiFeaturesEnabled={isAiFeaturesEnabled()}
      aiDraftingConfigured={isAiDraftingConfigured()}
      initialSelectedLeadId={selectedLeadId}
      initialCreateLead={params.create === "1" && activeTab === "pipeline"}
      initialLeadStatusFilter={params.status}
      initialLeadFollowUpDue={params.filter === "follow_up_due"}
      initialLeadListFilter={params.queue}
    />
  );
}
