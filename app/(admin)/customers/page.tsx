import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { isAiDraftingConfigured, isAiFeaturesEnabled } from "@/lib/ai/env";
import { canViewBilling, getCompanyAccessScope } from "@/lib/database/access-control";
import { getActiveCompanyContext } from "@/lib/database/company-context";
import { applyCustomerOperationalStats } from "@/lib/database/queries/customers";
import { listCustomerOperationalStatsForCustomers } from "@/lib/database/queries/customer-operational-stats-scoped";
import {
  getCustomerQueueCounts,
  listCustomersPage,
} from "@/lib/database/queries/customers-page";
import { resolveInitialCustomerWorkQueue } from "@/shared/components/customers/customer-work-queues";
import { listLeadActivitiesForLead } from "@/lib/database/queries/lead-activities";
import { listLeadAssignableMembers } from "@/lib/database/queries/leads";
import {
  getLeadFilterCounts,
  getLeadPipelineAggregates,
  listLeadsPage,
  EMPTY_LEAD_PIPELINE_AGGREGATES,
} from "@/lib/database/queries/leads-page";
import { getLeadFollowUpDueCutoff } from "@/shared/lib/leads/lead-status";
import { resolveInitialLeadListFilter } from "@/shared/components/leads/lead-work-queues";
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
    /** Server-side customer search. */
    q?: string;
  }>;
};

export const metadata: Metadata = {
  title: "Customers",
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

  // Both customer tabs are served one page at a time, filtered, sorted and
  // counted by the database. Nothing here loads the customer book into memory:
  // the previous version did, and PostgREST silently capped it at 1,000 rows, so
  // a tenant with 5,000 customers could not reach 4,000 of them at all.
  const customerQueue = resolveInitialCustomerWorkQueue(params.queue);
  const monthStartIso = new Date(
    `${new Date().toISOString().slice(0, 7)}-01T00:00:00.000Z`,
  ).toISOString();

  // The pipeline is read only when the pipeline is on screen. It used to load
  // every lead in the tenant on every request to this route, including the two
  // tabs that never render one.
  const isPipelineTab = activeTab === "pipeline";
  const leadFilter = resolveInitialLeadListFilter(
    params.status as never,
    params.filter === "follow_up_due",
    params.queue && isPipelineTab ? (params.queue as never) : undefined,
  );
  // Derived from the company's zone, once, and passed to both the SQL filters
  // and the aggregate RPC — so "due today" means one thing on this page.
  const followUpCutoff = getLeadFollowUpDueCutoff(new Date(), companyTimeZone);

  const [
    customersPage,
    archivedPage,
    customerCounts,
    leadsPage,
    leadFilterCounts,
    leadAggregates,
    assignableMembers,
  ] = await Promise.all([
    listCustomersPage(companyContext.company.id, {
      queue: customerQueue,
      search: params.q ?? null,
    }),
    listCustomersPage(companyContext.company.id, {
      queue: "past",
      search: params.q ?? null,
    }),
    getCustomerQueueCounts(companyContext.company.id, { monthStartIso }),
    isPipelineTab
      ? listLeadsPage(companyContext.company.id, {
          filter: leadFilter,
          followUpCutoff,
          search: params.q ?? null,
        })
      : Promise.resolve(null),
    isPipelineTab
      ? getLeadFilterCounts(companyContext.company.id, { followUpCutoff })
      : Promise.resolve(null),
    isPipelineTab
      ? getLeadPipelineAggregates(companyContext.company.id, { followUpCutoff })
      : Promise.resolve(EMPTY_LEAD_PIPELINE_AGGREGATES),
    listLeadAssignableMembers(companyContext.company.id),
  ]);

  const leads = leadsPage?.rows ?? [];

  // Stats are fetched for the customers actually on screen, and read to
  // completion rather than to PostgREST's first 1,000 rows — see
  // lib/database/queries/customer-operational-stats-scoped.ts.
  const pageCustomerIds = [
    ...customersPage.rows.map((customer) => customer.id),
    ...archivedPage.rows.map((customer) => customer.id),
  ];
  const operationalStatsByCustomer =
    await listCustomerOperationalStatsForCustomers(
      companyContext.company.id,
      pageCustomerIds,
    );

  const withStats = (rows: typeof customersPage.rows) =>
    applyCustomerOperationalStats(rows, operationalStatsByCustomer, {
      includeRevenue: canViewCustomerBilling,
    });

  const enrichedCustomersPage = { ...customersPage, rows: withStats(customersPage.rows) };
  const enrichedArchivedPage = { ...archivedPage, rows: withStats(archivedPage.rows) };
  const visibleCustomers = enrichedCustomersPage.rows;

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
      customersPage={enrichedCustomersPage}
      archivedPage={enrichedArchivedPage}
      customerCounts={customerCounts}
      canManageCustomers={companyContext.permissions.manageCustomers}
      initialLeads={leads}
      leadsPage={leadsPage}
      leadFilterCounts={leadFilterCounts}
      leadAggregates={leadAggregates}
      activitiesByLeadId={activitiesByLeadId}
      assignableMembers={assignableMembers}
      aiFeaturesEnabled={isAiFeaturesEnabled()}
      aiDraftingConfigured={isAiDraftingConfigured()}
      initialSelectedLeadId={selectedLeadId}
      initialCreateLead={params.create === "1" && activeTab === "pipeline"}
      initialLeadStatusFilter={params.status}
      initialLeadFollowUpDue={params.filter === "follow_up_due"}
      initialLeadListFilter={
        activeTab === "pipeline" ? params.queue : undefined
      }
      initialCustomerWorkQueue={
        activeTab === "customers" ? params.queue : undefined
      }
    />
  );
}
