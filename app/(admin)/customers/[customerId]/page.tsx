import { notFound, redirect } from "next/navigation";
import { getActiveCompanyContext } from "@/lib/database/company-context";
import { getCustomerById } from "@/lib/database/queries/customers";
import { listJobsByCustomer } from "@/lib/database/queries/jobs";
import { CustomerDetailPageView } from "@/shared/components/customers/CustomerDetailPageView";

type CustomerDetailPageProps = {
  params: Promise<{ customerId: string }>;
};

export default async function CustomerDetailPage({
  params,
}: CustomerDetailPageProps) {
  const { customerId } = await params;
  const companyContext = await getActiveCompanyContext();

  if (!companyContext) {
    redirect("/setup");
  }

  const [customer, jobs] = await Promise.all([
    getCustomerById(companyContext.company.id, customerId),
    listJobsByCustomer(companyContext.company.id, customerId),
  ]);

  if (!customer) {
    notFound();
  }

  return (
    <CustomerDetailPageView
      customer={customer}
      jobs={jobs}
      canCreateJob={companyContext.permissions.dispatchJobs}
    />
  );
}
