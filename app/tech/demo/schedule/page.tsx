import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { mockTechnicianDashboard } from "@/shared/data/mock-technician-dashboard";
import { TechnicianAssignedJobsView } from "@/shared/components/technician/TechnicianAssignedJobsView";
import type { TechnicianJob } from "@/shared/types/technician";

export const metadata: Metadata = {
  title: "Schedule (demo)",
};

/**
 * Development-only mock of the real technician schedule screen
 * (`/technician/schedule`) with three jobs placed on today's date, so the
 * phone layout of the schedule, the job hero, the job detail overlay and the
 * command center can be checked without seeding jobs in a real company.
 * Mutations from this page hit real actions with mock ids and will fail
 * safely; it exists for layout QA only. Not available in production.
 */
export default function TechDemoSchedulePage() {
  if (process.env.NODE_ENV !== "development") {
    notFound();
  }

  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";

  function todayAt(hour: number, minute: number): string {
    const date = new Date();
    date.setHours(hour, minute, 0, 0);
    return date.toISOString();
  }

  const source = [
    mockTechnicianDashboard.currentJob,
    ...mockTechnicianDashboard.upcomingJobs,
  ].filter((job): job is TechnicianJob => job !== null);

  const times: [number, number][] = [
    [9, 0],
    [13, 30],
    [16, 0],
    [17, 30],
  ];

  const jobs: TechnicianJob[] = source.map((job, index) => ({
    ...job,
    scheduledDate: todayAt(...(times[index] ?? times[times.length - 1])),
    // The mock "current" job is in progress; keep the rest as given so the
    // hero, "Up next" rows and status badges all render.
    status: index === 0 ? "arrived" : job.status,
  }));

  return (
    <TechnicianAssignedJobsView
      jobs={jobs}
      timeState={{ state: "clocked_in" }}
      serviceItems={[]}
      canManageTime
      canCreateEstimate
      canApproveOnSite={false}
      canViewBilling={false}
      canCollectPayment={false}
      onlinePaymentsEnabled={false}
      smsSendingConfigured={false}
      billingSummaries={{ estimatesByJobId: {}, invoicesByJobId: {} }}
      defaultTaxRate={0}
      companyTimeZone={timeZone}
      aiFeaturesEnabled={false}
    />
  );
}
