import type { Metadata } from "next";
import { redirect } from "next/navigation";
import {
  canAccessOperationalJobsArea,
  getCompanyAccessScope,
} from "@/lib/database/access-control";
import { getActiveCompanyContext } from "@/lib/database/company-context";
import {
  listScheduleMonthJobs,
  listScheduleWeekJobs,
} from "@/lib/database/queries/schedule";
import { SchedulePageView } from "@/shared/components/schedule/SchedulePageView";
import { UnauthorizedAccessView } from "@/shared/components/layout/UnauthorizedAccessView";
import { parseDateOnlySearchParam } from "@/shared/lib/date-only-search-param";
import {
  buildScheduleMonthDaySummaries,
  getScheduleMonthNavigation,
  resolveScheduleMonthFetchReference,
  resolveScheduleMonthReference,
} from "@/shared/lib/schedule-month";
import {
  buildScheduleWeekDaySummaries,
  getScheduleWeekNavigation,
  resolveScheduleWeekFetchReference,
  resolveScheduleWeekReference,
} from "@/shared/lib/schedule-week";
import { parseScheduleViewSearchParam } from "@/shared/lib/schedule-view";

type SchedulePageProps = {
  searchParams: Promise<{
    date?: string;
    view?: string;
  }>;
};

export const metadata: Metadata = {
  title: "Schedule",
};

export default async function SchedulePage({ searchParams }: SchedulePageProps) {
  const companyContext = await getActiveCompanyContext();

  if (!companyContext) {
    redirect("/setup");
  }

  if (!canAccessOperationalJobsArea(companyContext)) {
    return (
      <UnauthorizedAccessView description="Schedule access is limited to roles that can view or manage jobs." />
    );
  }

  const { date, view: viewParam } = await searchParams;
  const view = parseScheduleViewSearchParam(viewParam);
  const timeZone = companyContext.company.timezone;
  const dateOnly = parseDateOnlySearchParam(date);
  const access = getCompanyAccessScope(companyContext);
  const assignedTechnicianId = access.canViewAllJobs
    ? undefined
    : companyContext.user.id;

  if (view === "month") {
    const { reference: monthReference, referenceDateOnly } =
      resolveScheduleMonthReference(dateOnly, timeZone);
    const fetchReference = resolveScheduleMonthFetchReference(
      monthReference,
      timeZone,
    );
    const jobs = await listScheduleMonthJobs(companyContext.company.id, {
      monthReference,
      reference: fetchReference,
      timeZone,
      assignedTechnicianId,
    });
    const days = buildScheduleMonthDaySummaries(
      jobs,
      timeZone,
      monthReference,
    );
    const navigation = getScheduleMonthNavigation(referenceDateOnly, timeZone);

    return (
      <SchedulePageView
        view="month"
        days={days}
        navigation={navigation}
        timeZone={timeZone}
      />
    );
  }

  const { reference: weekReference, referenceDateOnly } =
    resolveScheduleWeekReference(dateOnly, timeZone);
  const fetchReference = resolveScheduleWeekFetchReference(
    weekReference,
    timeZone,
  );
  const jobs = await listScheduleWeekJobs(companyContext.company.id, {
    reference: fetchReference,
    timeZone,
    assignedTechnicianId,
  });
  const days = buildScheduleWeekDaySummaries(jobs, timeZone, weekReference);
  const navigation = getScheduleWeekNavigation(referenceDateOnly, timeZone);

  return (
    <SchedulePageView
      view="week"
      days={days}
      navigation={navigation}
      timeZone={timeZone}
    />
  );
}
