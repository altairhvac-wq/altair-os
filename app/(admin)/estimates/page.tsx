import { redirect } from "next/navigation";
import { isAiFeaturesEnabled } from "@/lib/ai/env";
import { canViewBilling } from "@/lib/database/access-control";
import { shouldShowAlphaComingSoon } from "@/lib/beta/alpha-hardening";
import { getActiveCompanyContext } from "@/lib/database/company-context";
import { ComingSoonView } from "@/shared/components/layout/ComingSoonView";
import { UnauthorizedAccessView } from "@/shared/components/layout/UnauthorizedAccessView";
import { getCompanyBillingDefaultsFromRow } from "@/lib/database/queries/companies";
import { listCustomers } from "@/lib/database/queries/customers";
import {
  listDeletedEstimates,
  listEstimates,
} from "@/lib/database/queries/estimates";
import { listInvoiceDocumentRefs } from "@/lib/database/queries/invoices";
import { listJobs } from "@/lib/database/queries/jobs";
import { listActiveServiceItems } from "@/lib/database/queries/service-items";
import { EstimatesPageView } from "@/shared/components/estimates/EstimatesPageView";
import { getEstimateCreateInitialData } from "@/shared/lib/company-billing-defaults";

type EstimatesPageProps = {
  searchParams: Promise<{
    customerId?: string;
    create?: string;
    leadId?: string;
    jobId?: string;
  }>;
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

  const { customerId, create, leadId, jobId } = await searchParams;

  const [estimates, deletedEstimates, customers, jobs, serviceItems, invoiceDocumentRefs] =
    await Promise.all([
    listEstimates(companyContext.company.id, { includeArchived: true }),
    listDeletedEstimates(companyContext.company.id),
    listCustomers(companyContext.company.id),
    listJobs(companyContext.company.id),
    listActiveServiceItems(companyContext.company.id),
    listInvoiceDocumentRefs(companyContext.company.id),
  ]);

  const preselectedCustomer = customerId
    ? customers.find((customer) => customer.id === customerId)
    : undefined;
  const preselectedJob =
    jobId && preselectedCustomer
      ? jobs.find(
          (job) =>
            job.id === jobId && job.customerId === preselectedCustomer.id,
        )
      : undefined;
  const billingDefaults = getCompanyBillingDefaultsFromRow(companyContext.company);
  const createInitialData = getEstimateCreateInitialData(
    billingDefaults,
    companyContext.company.timezone,
    preselectedCustomer
      ? {
          customerId: preselectedCustomer.id,
          ...(preselectedJob ? { jobId: preselectedJob.id } : {}),
        }
      : undefined,
  );

  return (
    <EstimatesPageView
      initialEstimates={[...estimates, ...deletedEstimates]}
      customers={customers}
      jobs={jobs}
      serviceItems={serviceItems}
      invoiceDocumentRefs={invoiceDocumentRefs}
      canManageEstimates={companyContext.permissions.manageBilling}
      canManageCustomers={companyContext.permissions.manageCustomers}
      initialPanelMode={create === "1" && preselectedCustomer ? "create" : "empty"}
      createInitialData={createInitialData}
      initialLeadId={leadId}
      aiFeaturesEnabled={isAiFeaturesEnabled()}
    />
  );
}
