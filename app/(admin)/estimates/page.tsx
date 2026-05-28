import { redirect } from "next/navigation";
import { canViewBilling } from "@/lib/database/access-control";
import { shouldShowAlphaComingSoon } from "@/lib/beta/alpha-hardening";
import { getActiveCompanyContext } from "@/lib/database/company-context";
import { ComingSoonView } from "@/shared/components/layout/ComingSoonView";
import { UnauthorizedAccessView } from "@/shared/components/layout/UnauthorizedAccessView";
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

  if (!canViewBilling(companyContext)) {
    return (
      <UnauthorizedAccessView description="Estimate records are limited to billing and admin roles." />
    );
  }

  if (shouldShowAlphaComingSoon("/estimates")) {
    return (
      <ComingSoonView
        title="Estimates coming soon"
        description="Estimate creation and customer approvals are being finalized for the internal alpha. Use jobs and invoices in the meantime."
      />
    );
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
