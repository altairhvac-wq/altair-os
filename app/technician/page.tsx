import { redirect } from "next/navigation";
import { getActiveCompanyContext } from "@/lib/database/company-context";
import { getCompanyBillingDefaultsFromRow } from "@/lib/database/queries/companies";
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
  const billingDefaults = getCompanyBillingDefaultsFromRow(context.company);

  const [jobs, timeState, serviceItems] = await Promise.all([
    listAssignedJobsForTechnician(context.company.id, context.user.id, {
      timeZone: context.company.timezone,
    }),
    getCurrentTimeState(context.company.id, context.user.id),
    listActiveServiceItems(context.company.id),
  ]);

  return (
    <TechnicianAssignedJobsView
      jobs={jobs}
      timeState={timeState}
      serviceItems={serviceItems}
      canManageTime={canManageTime}
      canCreateEstimate={canCreateEstimate}
      defaultTaxRate={billingDefaults.defaultTaxRate}
      companyTimeZone={context.company.timezone}
    />
  );
}
