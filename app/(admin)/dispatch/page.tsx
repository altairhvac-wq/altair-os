import { redirect } from "next/navigation";
import { getCompanyAccessScope } from "@/lib/database/access-control";
import { getActiveCompanyContext } from "@/lib/database/company-context";
import { listDispatchJobsForToday } from "@/lib/database/queries/dispatch";
import { listTechnicians } from "@/lib/database/queries/technicians";
import { DispatchPageView } from "@/shared/components/dispatch/DispatchPageView";
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
  const technicians = await listTechnicians(companyContext.company.id, jobs);

  return (
    <DispatchPageView
      initialJobs={jobs}
      technicians={technicians}
      canDispatchJobs={companyContext.permissions.dispatchJobs}
      canViewAssignedJobs={companyContext.permissions.viewAssignedJobs}
      currentUserId={companyContext.user.id}
      dispatchPageFocus={pageFocus}
    />
  );
}
