import { redirect } from "next/navigation";
import { isAiFeaturesEnabled } from "@/lib/ai/env";
import { canViewBilling } from "@/lib/database/access-control";
import { getActiveCompanyContext } from "@/lib/database/company-context";
import { getCompanyBillingDefaultsFromRow } from "@/lib/database/queries/companies";
import {
  listJobBillingSummariesForJobs,
  listJobInvoiceSummariesForAssignedJobs,
} from "@/lib/database/queries/job-billing-summaries";
import { listAssignedJobsForTechnician } from "@/lib/database/queries/technician-jobs";
import { listActiveServiceItems } from "@/lib/database/queries/service-items";
import {
  getCurrentTimeState,
} from "@/lib/database/services/time-tracking";
import { isCompanyOnlineCheckoutAvailable } from "@/lib/payments/online-checkout-availability";
import { TechnicianAssignedJobsView } from "@/shared/components/technician/TechnicianAssignedJobsView";

export default async function TechnicianPage() {
  const context = await getActiveCompanyContext();

  if (!context) {
    redirect("/setup");
  }

  const canManageTime = context.permissions.viewAssignedJobs;
  const canCreateEstimate =
    context.permissions.manageBilling ||
    context.permissions.createFieldEstimates;
  const canApproveOnSite =
    context.permissions.manageBilling ||
    context.permissions.createFieldEstimates;
  const canViewBillingData = canViewBilling(context);
  const canCollectPayment =
    context.permissions.manageBilling ||
    context.permissions.viewAssignedJobs;
  const billingDefaults = getCompanyBillingDefaultsFromRow(context.company);

  const [jobs, timeState, serviceItems, onlinePaymentsEnabled] =
    await Promise.all([
    listAssignedJobsForTechnician(context.company.id, context.user.id, {
      timeZone: context.company.timezone,
      scope: "operational_week",
    }),
    getCurrentTimeState(context.company.id, context.user.id),
    listActiveServiceItems(context.company.id),
    isCompanyOnlineCheckoutAvailable(context.company.id),
  ]);

  const billingSummaries = await listJobBillingSummariesForJobs(
    context.company.id,
    jobs.map((job) => job.id),
    { includeInvoices: canViewBillingData },
  );

  if (!canViewBillingData) {
    billingSummaries.invoicesByJobId =
      await listJobInvoiceSummariesForAssignedJobs(
        context.company.id,
        jobs.map((job) => job.id),
      );
  }

  return (
    <TechnicianAssignedJobsView
      jobs={jobs}
      timeState={timeState}
      serviceItems={serviceItems}
      canManageTime={canManageTime}
      canCreateEstimate={canCreateEstimate}
      canApproveOnSite={canApproveOnSite}
      canViewBilling={canViewBillingData}
      canCollectPayment={canCollectPayment}
      onlinePaymentsEnabled={onlinePaymentsEnabled}
      billingSummaries={billingSummaries}
      defaultTaxRate={billingDefaults.defaultTaxRate}
      companyTimeZone={context.company.timezone}
      aiFeaturesEnabled={isAiFeaturesEnabled()}
    />
  );
}
