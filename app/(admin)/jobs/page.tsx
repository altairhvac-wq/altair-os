import { redirect } from "next/navigation";
import { getActiveCompanyContext } from "@/lib/database/company-context";
import { listCustomers } from "@/lib/database/queries/customers";
import { listJobs } from "@/lib/database/queries/jobs";
import { JobsPageView } from "@/shared/components/jobs/JobsPageView";
import type { JobFormData } from "@/shared/types/job";

type JobsPageProps = {
  searchParams: Promise<{ customerId?: string; create?: string }>;
};

export default async function JobsPage({ searchParams }: JobsPageProps) {
  const companyContext = await getActiveCompanyContext();

  if (!companyContext) {
    redirect("/setup");
  }

  const { customerId, create } = await searchParams;

  const [jobs, customers] = await Promise.all([
    listJobs(companyContext.company.id),
    listCustomers(companyContext.company.id),
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
      initialPanelMode={create === "1" && preselectedCustomer ? "create" : "empty"}
      createInitialData={createInitialData}
    />
  );
}
