import { redirect } from "next/navigation";
import { getActiveCompanyContext } from "@/lib/database/company-context";
import { listCustomers } from "@/lib/database/queries/customers";
import { listEstimates } from "@/lib/database/queries/estimates";
import { listJobs } from "@/lib/database/queries/jobs";
import { listActiveServiceItems } from "@/lib/database/queries/service-items";
import { EstimatesPageView } from "@/shared/components/estimates/EstimatesPageView";

type EstimatesPageProps = {
  searchParams: Promise<{ customerId?: string; create?: string }>;
};

export default async function EstimatesPage({
  searchParams,
}: EstimatesPageProps) {
  const companyContext = await getActiveCompanyContext();

  if (!companyContext) {
    redirect("/setup");
  }

  const { customerId, create } = await searchParams;

  const [estimates, customers, jobs, serviceItems] = await Promise.all([
    listEstimates(companyContext.company.id),
    listCustomers(companyContext.company.id),
    listJobs(companyContext.company.id),
    listActiveServiceItems(companyContext.company.id),
  ]);

  const preselectedCustomer = customerId
    ? customers.find((customer) => customer.id === customerId)
    : undefined;

  return (
    <EstimatesPageView
      initialEstimates={estimates}
      customers={customers}
      jobs={jobs}
      serviceItems={serviceItems}
      canManageEstimates={companyContext.permissions.manageBilling}
      initialPanelMode={create === "1" && preselectedCustomer ? "create" : "empty"}
      createInitialData={
        preselectedCustomer
          ? { customerId: preselectedCustomer.id }
          : undefined
      }
    />
  );
}
