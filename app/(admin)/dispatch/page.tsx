import { redirect } from "next/navigation";
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
  const jobs = await listDispatchJobsForToday(companyContext.company.id);
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
      dispatchPageFocus={pageFocus}
    />
  );
}
