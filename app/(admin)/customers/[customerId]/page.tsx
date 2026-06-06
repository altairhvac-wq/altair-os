import { notFound, redirect } from "next/navigation";
import { getCompanyAccessScope, canAccessOperationalJobsArea, canViewBilling } from "@/lib/database/access-control";
import { getActiveCompanyContext } from "@/lib/database/company-context";
import { getCustomerById, getCustomerDeleteDependencies, getCustomerOperationalStats } from "@/lib/database/queries/customers";
import { mergeCustomerOperationalStats } from "@/shared/lib/customers/customer-operational-stats";
import { listEstimatesByCustomer } from "@/lib/database/queries/estimates";
import { listInvoicesByCustomer } from "@/lib/database/queries/invoices";
import { listJobsByCustomer } from "@/lib/database/queries/jobs";
import { listOperationalActivitiesForCustomer } from "@/lib/database/queries/operational-activities";
import { listRecentExpensesForCustomer } from "@/lib/database/queries/expenses";
import { listRecentJobAttachmentsForCustomer } from "@/lib/database/queries/job-attachments";
import { listCustomerEquipment } from "@/lib/database/queries/customer-equipment";
import { CustomerDetailPageView } from "@/shared/components/customers/CustomerDetailPageView";
import { UnauthorizedAccessView } from "@/shared/components/layout/UnauthorizedAccessView";
import {
  CUSTOMER_360_RECORD_LIMIT,
  getCustomer360Data,
} from "@/shared/lib/customers/customer-360";

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
    customerRecord,
    operationalStats,
    jobs,
    estimates,
    invoices,
    activities,
    equipment,
    recentPhotos,
    recentReceipts,
    deleteDependencies,
  ] = await Promise.all([
    getCustomerById(companyContext.company.id, customerId),
    getCustomerOperationalStats(companyContext.company.id, customerId),
    listJobsByCustomer(
      companyContext.company.id,
      customerId,
      CUSTOMER_360_RECORD_LIMIT,
    ),
    canViewBillingData
      ? listEstimatesByCustomer(
          companyContext.company.id,
          customerId,
          CUSTOMER_360_RECORD_LIMIT,
        )
      : Promise.resolve([]),
    canViewBillingData
      ? listInvoicesByCustomer(
          companyContext.company.id,
          customerId,
          CUSTOMER_360_RECORD_LIMIT,
        )
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
    getCustomerDeleteDependencies(companyContext.company.id, customerId),
  ]);

  if (!customerRecord) {
    notFound();
  }

  const customer = mergeCustomerOperationalStats(customerRecord, operationalStats);

  const customer360 = await getCustomer360Data(
    companyContext.company.id,
    customerId,
    {
      customer,
      jobs,
      estimates,
      invoices,
      equipment,
      activities,
      includeBilling: canViewBillingData,
      actionContext: {
        customerId,
        canCreateJob: companyContext.permissions.dispatchJobs,
        canAccessDispatch: canAccessOperationalJobsArea(companyContext),
      },
    },
  );

  const financialSummary = customer360?.financial ?? undefined;

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
      canManageCustomers={companyContext.permissions.manageCustomers}
      canManageEquipment={companyContext.permissions.manageCustomers}
      canViewBilling={canViewBillingData}
      canViewCompanyExpenses={access.canViewCompanyExpenses}
      financialSummary={financialSummary}
      customer360={customer360}
      deleteDependencies={deleteDependencies}
    />
  );
}
