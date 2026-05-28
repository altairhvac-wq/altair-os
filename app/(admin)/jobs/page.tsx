import { redirect } from "next/navigation";
import { canAccessOperationalJobsArea, canViewAllJobs } from "@/lib/database/access-control";
import { getActiveCompanyContext } from "@/lib/database/company-context";
import { listCustomers } from "@/lib/database/queries/customers";
import { listAssignedJobs, listJobs } from "@/lib/database/queries/jobs";
import { JobsPageView } from "@/shared/components/jobs/JobsPageView";
import { UnauthorizedAccessView } from "@/shared/components/layout/UnauthorizedAccessView";
import type { JobFormData } from "@/shared/types/job";

type JobsPageProps = {
  searchParams: Promise<{ customerId?: string; create?: string }>;
};

export default async function JobsPage({ searchParams }: JobsPageProps) {
  const companyContext = await getActiveCompanyContext();

  if (!companyContext) {
    redirect("/setup");
  }

  if (!canAccessOperationalJobsArea(companyContext)) {
    return (
      <UnauthorizedAccessView description="Job records are limited to roles that can view or manage jobs." />
    );
  }

  const { customerId, create } = await searchParams;

  const canViewAll = canViewAllJobs(companyContext);

  const [jobs, customers] = await Promise.all([
    canViewAll
      ? listJobs(companyContext.company.id)
      : listAssignedJobs(
          companyContext.company.id,
          companyContext.user.id,
        ),
    canViewAll ? listCustomers(companyContext.company.id) : Promise.resolve([]),
  ]);

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
      initialJobs={jobs}
      customers={customers}
      canDispatchJobs={companyContext.permissions.dispatchJobs}
      canManageCustomers={companyContext.permissions.manageCustomers}
      initialPanelMode={create === "1" && preselectedCustomer ? "create" : "empty"}
      createInitialData={createInitialData}
    />
  );
}
