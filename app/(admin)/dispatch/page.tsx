import { redirect } from "next/navigation";
import { getCompanyAccessScope, canAccessOperationalJobsArea, canViewBilling } from "@/lib/database/access-control";
import { getActiveCompanyContext } from "@/lib/database/company-context";
import { listDispatchJobsForToday } from "@/lib/database/queries/dispatch";
import { listJobBillingSummariesForJobs } from "@/lib/database/queries/job-billing-summaries";
import { listTechnicians } from "@/lib/database/queries/technicians";
import { DispatchPageView } from "@/shared/components/dispatch/DispatchPageView";
import { UnauthorizedAccessView } from "@/shared/components/layout/UnauthorizedAccessView";
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
  const technicians = access.canViewTechnicianRoster
    ? await listTechnicians(companyContext.company.id, companyContext, jobs)
    : [];
  const canViewBillingData = canViewBilling(companyContext);
  const billingSummaries = canViewBillingData
    ? await listJobBillingSummariesForJobs(
        companyContext.company.id,
        jobs.map((job) => job.id),
      )
    : { estimatesByJobId: {}, invoicesByJobId: {} };

  return (
    <DispatchPageView
      initialJobs={jobs}
      technicians={technicians}
      canDispatchJobs={companyContext.permissions.dispatchJobs}
      canViewAssignedJobs={companyContext.permissions.viewAssignedJobs}
      canViewBilling={canViewBillingData}
      billingSummaries={billingSummaries}
      currentUserId={companyContext.user.id}
      dispatchPageFocus={pageFocus}
    />
  );
}
