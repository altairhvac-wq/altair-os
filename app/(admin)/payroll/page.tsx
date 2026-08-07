import { redirect } from "next/navigation";
import { canViewCompanyTimeEntries } from "@/lib/database/access-control";
import { getActiveCompanyContext } from "@/lib/database/company-context";
import { getJobById } from "@/lib/database/queries/jobs";
import {
  listActiveTechnicianTimeEntries,
  listTimeEntries,
} from "@/lib/database/queries/time-entries";
import { PayrollPageView } from "@/shared/components/time-clock/PayrollPageView";

type PayrollPageProps = {
  searchParams: Promise<{ jobId?: string }>;
};

/**
 * Payroll (`/payroll`) — canonical route per ALTAIR_ARCHITECTURE.md; the
 * legacy `/time` route redirects here. Active technicians, time entries,
 * and payroll review.
 */
export default async function PayrollPage({ searchParams }: PayrollPageProps) {
  const context = await getActiveCompanyContext();

  if (!context) {
    redirect("/setup");
  }

  const { jobId } = await searchParams;
  const job = jobId ? await getJobById(context.company.id, jobId) : null;

  const canViewAll = canViewCompanyTimeEntries(context);

  const [entries, activeEntries] = canViewAll
    ? await Promise.all([
        listTimeEntries(context.company.id, { limit: 100 }),
        listActiveTechnicianTimeEntries(context.company.id),
      ])
    : [[], []];

  return (
    <PayrollPageView
      entries={entries}
      activeEntries={activeEntries}
      canViewAll={canViewAll}
      initialJobId={job?.id}
      initialJobLabel={job?.jobNumber}
    />
  );
}
