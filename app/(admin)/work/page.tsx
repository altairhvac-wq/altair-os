import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { canAccessOperationalJobsArea, canViewAllJobs } from "@/lib/database/access-control";
import { getActiveCompanyContext } from "@/lib/database/company-context";
import { getCustomerById } from "@/lib/database/queries/customers";
import { listCustomerOptions } from "@/lib/database/queries/customers-page";
import {
  listDeletedJobs,
  listJobsForOperationalDay,
} from "@/lib/database/queries/jobs";
import { listJobBillingSummariesForJobs } from "@/lib/database/queries/job-billing-summaries";
import { listTechnicians } from "@/lib/database/queries/technicians";
import { JobsPageView } from "@/shared/components/jobs/JobsPageView";
import { listJobsPage } from "@/lib/database/queries/list-pages";
import { UnauthorizedAccessView } from "@/shared/components/layout/UnauthorizedAccessView";
import { parseJobsPageSearchParams } from "@/shared/lib/jobs-page-filters";
import type { JobFormData } from "@/shared/types/job";

type WorkPageProps = {
  searchParams: Promise<{
    customerId?: string;
    create?: string;
    status?: string;
    view?: string;
    unassigned?: string;
    priority?: string;
  }>;
};

/** Work hub — hosts the Jobs list (Today/All, status pills, filters) unchanged. */
export const metadata: Metadata = {
  title: "Work",
};

export default async function WorkPage({ searchParams }: WorkPageProps) {
  const companyContext = await getActiveCompanyContext();

  if (!companyContext) {
    redirect("/setup");
  }

  if (!canAccessOperationalJobsArea(companyContext)) {
    return (
      <UnauthorizedAccessView description="Job records are limited to roles that can view or manage jobs." />
    );
  }

  const { customerId, create, status, view, unassigned, priority } =
    await searchParams;
  const pageFilters = parseJobsPageSearchParams({
    status,
    view,
    unassigned,
    priority,
  });

  const canViewAll = canViewAllJobs(companyContext);

  const canDispatchJobs = companyContext.permissions.dispatchJobs;

  // The All Jobs tab is served one page at a time, with lifecycle, status,
  // priority and assignment applied in SQL. Search is separate: it ranks, and
  // the ranking stays in the browser over candidates the server draws from the
  // whole tenant — see searchJobCandidates.
  const jobsPage = await listJobsPage(companyContext.company.id, {
    statusFilter: pageFilters.statusFilter,
    priorityFilter: pageFilters.priorityFilter,
    unassignedOnly: pageFilters.unassignedOnly,
    assignedTechnicianId: canViewAll ? null : companyContext.user.id,
  });

  // The customer picker and the search page's customer section used to be fed
  // every customer in the company: 1.27 MB of rows on the seeded tenant, which
  // serialized into a 3.56 MB page, on a route where most visits never open
  // the picker at all. They now get a bounded slice, and searching goes to the
  // server through searchCustomerOptionsAction — which searches the WHOLE
  // tenant, so it can offer customers the old array had already truncated away.
  const [jobs, deletedJobs, todayJobs, customerOptions, technicians] =
    await Promise.all([
    Promise.resolve(jobsPage.rows),
    canViewAll
      ? listDeletedJobs(companyContext.company.id)
      : Promise.resolve([]),
    listJobsForOperationalDay(companyContext.company.id, {
      timeZone: companyContext.company.timezone,
      assignedTechnicianId: canViewAll
        ? undefined
        : companyContext.user.id,
    }),
    canViewAll
      ? listCustomerOptions(companyContext.company.id)
      : Promise.resolve({ customers: [], truncated: false }),
    canDispatchJobs
      ? listTechnicians(companyContext.company.id, companyContext)
      : Promise.resolve([]),
    ]);

  const customers = customerOptions.customers;

  const allJobsForBilling = [...jobs, ...deletedJobs, ...todayJobs];
  const billingSummaries = await listJobBillingSummariesForJobs(
    companyContext.company.id,
    allJobsForBilling.map((job) => job.id),
  );

  // By primary key, not by scanning an array that may not contain them. The
  // deep link carries a customer id; the bounded option list is the newest
  // twenty-five and has no reason to include that particular customer.
  const preselectedCustomer =
    customerId && canViewAll
      ? ((await getCustomerById(companyContext.company.id, customerId)) ??
        undefined)
      : undefined;

  const createInitialData: Partial<JobFormData> | undefined =
    preselectedCustomer
      ? {
          customerId: preselectedCustomer.id,
          serviceAddress: preselectedCustomer.address,
          city: preselectedCustomer.city,
          state: preselectedCustomer.state,
          zip: preselectedCustomer.zip,
        }
      : undefined;

  return (
    <JobsPageView
      initialJobs={[...jobs, ...deletedJobs]}
      serverPage={jobsPage}
      initialTodayJobs={todayJobs}
      companyTimeZone={companyContext.company.timezone}
      customers={customers}
      technicians={technicians}
      canDispatchJobs={canDispatchJobs}
      canManageCustomers={companyContext.permissions.manageCustomers}
      initialPanelMode={create === "1" && preselectedCustomer ? "create" : "empty"}
      createInitialData={createInitialData}
      initialViewTab={pageFilters.viewTab}
      initialStatusFilter={pageFilters.statusFilter}
      initialPriorityFilter={pageFilters.priorityFilter}
      initialUnassignedOnly={pageFilters.unassignedOnly}
      billingSummaries={billingSummaries}
    />
  );
}
