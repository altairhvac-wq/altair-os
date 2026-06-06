import { redirect } from "next/navigation";
import { getCompanyAccessScope, canAccessOperationalJobsArea, canViewBilling } from "@/lib/database/access-control";
import { getActiveCompanyContext } from "@/lib/database/company-context";
import { listDispatchJobsForToday } from "@/lib/database/queries/dispatch";
import { listJobBillingSummariesForJobs } from "@/lib/database/queries/job-billing-summaries";
import { listTechnicians } from "@/lib/database/queries/technicians";
import { DispatchPageView } from "@/shared/components/dispatch/DispatchPageView";
import { UnauthorizedAccessView } from "@/shared/components/layout/UnauthorizedAccessView";
import { isAiFeaturesEnabled } from "@/lib/ai/env";
import {
  enrichDispatchPageFocusState,
  parseDispatchPageSearchParams,
} from "@/shared/lib/dispatch-page-focus";

type DispatchPageProps = {
  searchParams: Promise<{
    focus?: string;
  }>;
};

export default async function DispatchPage({ searchParams }: DispatchPageProps) {
  const companyContext = await getActiveCompanyContext();

  if (!companyContext) {
    redirect("/setup");
  }

  if (!canAccessOperationalJobsArea(companyContext)) {
    return (
      <UnauthorizedAccessView description="Dispatch access is limited to roles that can view or manage jobs." />
    );
  }

  const { focus } = await searchParams;
  const access = getCompanyAccessScope(companyContext);
  const allJobs = await listDispatchJobsForToday(companyContext.company.id, {
    timeZone: companyContext.company.timezone,
  });
  const jobs = access.canViewAllJobs
    ? allJobs
    : allJobs.filter(
        (job) => job.technicianId === companyContext.user.id,
      );
  const pageFocus = enrichDispatchPageFocusState(
    parseDispatchPageSearchParams({ focus }),
    jobs,
  );
  const canViewBillingData = canViewBilling(companyContext);
  const techniciansPromise = access.canViewTechnicianRoster
    ? listTechnicians(companyContext.company.id, companyContext, jobs)
    : Promise.resolve([]);
  const billingSummariesPromise = canViewBillingData
    ? listJobBillingSummariesForJobs(
        companyContext.company.id,
        jobs.map((job) => job.id),
      )
    : Promise.resolve({ estimatesByJobId: {}, invoicesByJobId: {} });
  const [technicians, billingSummaries] = await Promise.all([
    techniciansPromise,
    billingSummariesPromise,
  ]);

  return (
    <DispatchPageView
      initialJobs={jobs}
      technicians={technicians}
      canDispatchJobs={companyContext.permissions.dispatchJobs}
      canViewAssignedJobs={companyContext.permissions.viewAssignedJobs}
      canManageCustomers={access.canManageCustomers}
      canViewBilling={canViewBillingData}
      aiFeaturesEnabled={isAiFeaturesEnabled()}
      billingSummaries={billingSummaries}
      currentUserId={companyContext.user.id}
      dispatchPageFocus={pageFocus}
    />
  );
}
