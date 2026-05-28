import { notFound, redirect } from "next/navigation";
import { getCompanyAccessScope, canViewBilling } from "@/lib/database/access-control";
import { getActiveCompanyContext } from "@/lib/database/company-context";
import { getCustomerById } from "@/lib/database/queries/customers";
import { listEstimatesByCustomer } from "@/lib/database/queries/estimates";
import { listInvoicesByCustomer } from "@/lib/database/queries/invoices";
import { listJobsByCustomer } from "@/lib/database/queries/jobs";
import { listOperationalActivitiesForCustomer } from "@/lib/database/queries/operational-activities";
import { listRecentExpensesForCustomer } from "@/lib/database/queries/expenses";
import { listRecentJobAttachmentsForCustomer } from "@/lib/database/queries/job-attachments";
import { listCustomerEquipment } from "@/lib/database/queries/customer-equipment";
import { CustomerDetailPageView } from "@/shared/components/customers/CustomerDetailPageView";
import { UnauthorizedAccessView } from "@/shared/components/layout/UnauthorizedAccessView";

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

  if (!getCompanyAccessScope(companyContext).canManageCustomers) {
    return (
      <UnauthorizedAccessView description="Customer records are limited to office and dispatch roles." />
    );
  }

  const access = getCompanyAccessScope(companyContext);
  const canViewBillingData = canViewBilling(companyContext);

  const [
    customer,
    jobs,
    estimates,
    invoices,
    activities,
    equipment,
    recentPhotos,
    recentReceipts,
  ] = await Promise.all([
    getCustomerById(companyContext.company.id, customerId),
    listJobsByCustomer(companyContext.company.id, customerId),
    canViewBillingData
      ? listEstimatesByCustomer(companyContext.company.id, customerId)
      : Promise.resolve([]),
    canViewBillingData
      ? listInvoicesByCustomer(companyContext.company.id, customerId)
      : Promise.resolve([]),
    listOperationalActivitiesForCustomer(companyContext.company.id, customerId, {
      includeBillingActivities: canViewBillingData,
    }),
    listCustomerEquipment(companyContext.company.id, customerId, {
      includeInactive: true,
    }),
    listRecentJobAttachmentsForCustomer(companyContext.company.id, customerId, {
      limit: 6,
      imagesOnly: true,
    }),
    access.canViewCompanyExpenses
      ? listRecentExpensesForCustomer(companyContext.company.id, customerId, {
          limit: 6,
          withReceiptOnly: true,
        })
      : Promise.resolve([]),
  ]);

  if (!customer) {
    notFound();
  }

  return (
    <CustomerDetailPageView
      customer={customer}
      jobs={jobs}
      estimates={estimates}
      invoices={invoices}
      activities={activities}
      equipment={equipment}
      recentPhotos={recentPhotos}
      recentReceipts={recentReceipts}
      canCreateJob={companyContext.permissions.dispatchJobs}
      canManageEquipment={companyContext.permissions.manageCustomers}
      canViewBilling={canViewBillingData}
      canViewCompanyExpenses={access.canViewCompanyExpenses}
    />
  );
}
