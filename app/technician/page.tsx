import { redirect } from "next/navigation";
import { isAiFeaturesEnabled } from "@/lib/ai/env";
import { canViewBilling } from "@/lib/database/access-control";
import { getActiveCompanyContext } from "@/lib/database/company-context";
import { getCompanyBillingDefaultsFromRow } from "@/lib/database/queries/companies";
import { listJobBillingSummariesForJobs } from "@/lib/database/queries/job-billing-summaries";
import { listAssignedJobsForTechnician } from "@/lib/database/queries/technician-jobs";
import { listActiveServiceItems } from "@/lib/database/queries/service-items";
import {
  getCurrentTimeState,
} from "@/lib/database/services/time-tracking";
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
  const billingDefaults = getCompanyBillingDefaultsFromRow(context.company);

  const [jobs, timeState, serviceItems] = await Promise.all([
    listAssignedJobsForTechnician(context.company.id, context.user.id, {
      timeZone: context.company.timezone,
      scope: "operational_week",
    }),
    getCurrentTimeState(context.company.id, context.user.id),
    listActiveServiceItems(context.company.id),
  ]);

  const billingSummaries = await listJobBillingSummariesForJobs(
    context.company.id,
    jobs.map((job) => job.id),
    { includeInvoices: canViewBillingData },
  );

  return (
    <TechnicianAssignedJobsView
      jobs={jobs}
      timeState={timeState}
      serviceItems={serviceItems}
      canManageTime={canManageTime}
      canCreateEstimate={canCreateEstimate}
      canApproveOnSite={canApproveOnSite}
      canViewBilling={canViewBillingData}
      billingSummaries={billingSummaries}
      defaultTaxRate={billingDefaults.defaultTaxRate}
      companyTimeZone={context.company.timezone}
      aiFeaturesEnabled={isAiFeaturesEnabled()}
    />
  );
}
