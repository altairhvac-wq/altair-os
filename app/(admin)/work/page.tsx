import { redirect } from "next/navigation";
import { canAccessOperationalJobsArea, canViewAllJobs } from "@/lib/database/access-control";
import { getActiveCompanyContext } from "@/lib/database/company-context";
import { listCustomers } from "@/lib/database/queries/customers";
import {
  listAssignedJobs,
  listDeletedJobs,
  listJobs,
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

  const [jobs, deletedJobs, todayJobs, customers, technicians] = await Promise.all([
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
    canViewAll ? listCustomers(companyContext.company.id) : Promise.resolve([]),
    canDispatchJobs
      ? listTechnicians(companyContext.company.id, companyContext)
      : Promise.resolve([]),
  ]);

  const allJobsForBilling = [...jobs, ...deletedJobs, ...todayJobs];
  const billingSummaries = await listJobBillingSummariesForJobs(
    companyContext.company.id,
    allJobsForBilling.map((job) => job.id),
  );

  const preselectedCustomer = customerId
    ? customers.find((customer) => customer.id === customerId)
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
