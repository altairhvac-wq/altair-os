import { redirect } from "next/navigation";
import { canViewBilling } from "@/lib/database/access-control";
import { getActiveCompanyContext } from "@/lib/database/company-context";
import { getCompanyBillingDefaultsFromRow } from "@/lib/database/queries/companies";
import { listCustomers } from "@/lib/database/queries/customers";
import { listDeletedInvoices } from "@/lib/database/queries/invoices";
import { listInvoicesWithBillingSync } from "@/lib/database/services/invoice-billing";
import { listJobs } from "@/lib/database/queries/jobs";
import { listActiveServiceItems } from "@/lib/database/queries/service-items";
import { InvoicesPageView } from "@/shared/components/invoices/InvoicesPageView";
import { getInvoiceCreateInitialData } from "@/shared/lib/company-billing-defaults";
import { UnauthorizedAccessView } from "@/shared/components/layout/UnauthorizedAccessView";
import { parseInvoicePageSearchParams } from "@/shared/lib/invoice-page-focus";

type InvoicesPageProps = {
  searchParams: Promise<{
    customerId?: string;
    jobId?: string;
    create?: string;
    status?: string;
    focus?: string;
  }>;
};

export default async function InvoicesPage({ searchParams }: InvoicesPageProps) {
  const companyContext = await getActiveCompanyContext();

  if (!companyContext) {
    redirect("/setup");
  }

  if (!canViewBilling(companyContext)) {
    return (
      <UnauthorizedAccessView description="Invoice records are limited to billing and admin roles." />
    );
  }

  const { customerId, jobId, create, status, focus } = await searchParams;
  const pageFocus = parseInvoicePageSearchParams({
    status,
    focus,
    customerId,
    jobId,
    create,
  });

  const [invoices, deletedInvoices, customers, jobs, serviceItems] =
    await Promise.all([
    listInvoicesWithBillingSync(companyContext.company.id, companyContext.company.timezone, {
      includeArchived: true,
    }),
    listDeletedInvoices(companyContext.company.id),
    listCustomers(companyContext.company.id),
    listJobs(companyContext.company.id),
    listActiveServiceItems(companyContext.company.id),
  ]);

  const preselectedJob = jobId
    ? jobs.find((job) => job.id === jobId)
    : undefined;

  const preselectedCustomerFromParam = customerId
    ? customers.find((customer) => customer.id === customerId)
    : undefined;

  const customerJobMismatch = Boolean(
    preselectedCustomerFromParam &&
      preselectedJob &&
      preselectedCustomerFromParam.id !== preselectedJob.customerId,
  );

  const validJob = customerJobMismatch
    ? undefined
    : preselectedJob &&
        (!preselectedCustomerFromParam ||
          preselectedJob.customerId === preselectedCustomerFromParam.id)
      ? preselectedJob
      : undefined;

  const preselectedCustomer = customerJobMismatch
    ? preselectedCustomerFromParam
    : preselectedCustomerFromParam ??
      (validJob
        ? customers.find((customer) => customer.id === validJob.customerId)
        : undefined);

  const shouldOpenCreate =
    create === "1" && Boolean(preselectedCustomer ?? validJob);
  const billingDefaults = getCompanyBillingDefaultsFromRow(companyContext.company);
  const createInitialData = getInvoiceCreateInitialData(
    billingDefaults,
    companyContext.company.timezone,
    preselectedCustomer || validJob
      ? {
          customerId: preselectedCustomer?.id ?? validJob!.customerId,
          jobId: validJob?.id ?? "",
        }
      : undefined,
  );

  return (
    <InvoicesPageView
      initialInvoices={[...invoices, ...deletedInvoices]}
      customers={customers}
      jobs={jobs}
      serviceItems={serviceItems}
      canManageInvoices={companyContext.permissions.manageBilling}
      canManageCustomers={companyContext.permissions.manageCustomers}
      initialPanelMode={shouldOpenCreate ? "create" : "empty"}
      createInitialData={createInitialData}
      initialJobId={validJob?.id}
      initialJobLabel={validJob?.jobNumber}
      initialCreateMode={create === "1"}
      initialStatusFilter={pageFocus.statusFilter}
      invoicePageFocus={pageFocus}
    />
  );
}
