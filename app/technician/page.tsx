import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getActiveCompanyContext } from "@/lib/database/company-context";
import { listAssignedJobsForTechnician } from "@/lib/database/queries/technician-jobs";
import {
  getCurrentTimeState,
} from "@/lib/database/services/time-tracking";
import {
  TechnicianHomeScreen,
  type TechnicianHomeNextJob,
} from "@/shared/components/technician/TechnicianHomeScreen";
import { hasCompleteServiceAddress } from "@/shared/lib/maps";
import { formatDateInTimeZone } from "@/shared/lib/datetime";
import {
  filterJobsForTechnicianScheduleDay,
  getTechnicianTodayDateOnly,
  type TechnicianScheduleDayContext,
} from "@/shared/lib/technician-week-schedule";
import {
  getTechnicianJobDeckOrder,
  sortCompletedTodayTechnicianJobs,
} from "@/shared/lib/technician-work-queue";
import {
  formatTechnicianJobAddress,
  formatTechnicianJobTime,
} from "@/shared/types/technician";
import {
  formatTechnicianTimeState,
  formatTime,
} from "@/shared/types/time-entry";
import { TechnicianScheduleContent } from "./schedule-content";

type TechnicianPageProps = {
  searchParams: Promise<{ jobId?: string }>;
};

// Dots on a light card: green = on the clock, amber = on a break, neutral = off.
const TIME_STATE_DOT_CLASSES: Record<string, string> = {
  clocked_in: "bg-altair-success",
  on_break: "bg-altair-warning",
  working_job: "bg-altair-success",
  off_clock: "bg-altair-ink-on-paper-muted",
};

export const metadata: Metadata = {
  title: "Home",
};

export default async function TechnicianPage({
  searchParams,
}: TechnicianPageProps) {
  const { jobId: initialJobId } = await searchParams;

  // Job deep links (?jobId=) keep the full schedule + detail experience.
  if (initialJobId?.trim()) {
    return <TechnicianScheduleContent initialJobId={initialJobId} />;
  }

  const context = await getActiveCompanyContext();

  if (!context) {
    redirect("/setup");
  }

  const timeZone = context.company.timezone;

  const [jobs, timeState] = await Promise.all([
    listAssignedJobsForTechnician(context.company.id, context.user.id, {
      timeZone,
      scope: "operational_week",
    }),
    getCurrentTimeState(context.company.id, context.user.id),
  ]);

  const scheduleContext: TechnicianScheduleDayContext = {
    timeZone,
    todayDateOnly: getTechnicianTodayDateOnly(timeZone),
    reference: new Date(),
  };
  const todayJobs = filterJobsForTechnicianScheduleDay(
    jobs,
    scheduleContext.todayDateOnly,
    scheduleContext,
  );
  const deckJobs = getTechnicianJobDeckOrder(todayJobs);
  const completedTodayCount = sortCompletedTodayTechnicianJobs(jobs, {
    timeZone,
  }).length;
  const nextJobRecord = deckJobs[0] ?? null;
  const nextJob: TechnicianHomeNextJob | null = nextJobRecord
    ? {
        id: nextJobRecord.id,
        customerName: nextJobRecord.customerName,
        jobType: nextJobRecord.jobType,
        timeLabel: formatTechnicianJobTime(nextJobRecord.scheduledDate, timeZone),
        addressLine: hasCompleteServiceAddress({
          serviceAddress: nextJobRecord.serviceAddress,
          city: nextJobRecord.city,
          state: nextJobRecord.state,
          zip: nextJobRecord.zip,
        })
          ? formatTechnicianJobAddress(nextJobRecord)
          : null,
        status: nextJobRecord.status,
      }
    : null;

  const noonUtc = new Date(
    `${scheduleContext.todayDateOnly}T12:00:00.000Z`,
  );
  const weekdayLabel = formatDateInTimeZone(noonUtc, timeZone, {
    weekday: "long",
  });
  const monthLabel = formatDateInTimeZone(noonUtc, timeZone, {
    month: "long",
  });
  const dayOfMonth =
    Number(scheduleContext.todayDateOnly.slice(8, 10)) || 0;

  const hourInZone = Number(
    new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      hourCycle: "h23",
      timeZone,
    }).format(new Date()),
  );
  const greeting =
    hourInZone < 12
      ? "Good morning"
      : hourInZone < 17
        ? "Good afternoon"
        : "Good evening";

  const activeSince = timeState.activeEntry?.startedAt ?? null;

  return (
    <TechnicianHomeScreen
      greeting={greeting}
      weekdayLabel={weekdayLabel}
      monthLabel={monthLabel}
      dayOfMonth={dayOfMonth}
      openJobCount={deckJobs.length}
      completedTodayCount={completedTodayCount}
      nextJob={nextJob}
      timeStateLabel={formatTechnicianTimeState(timeState.state)}
      timeStateDotClass={
        TIME_STATE_DOT_CLASSES[timeState.state] ?? "bg-altair-ink-on-paper-muted"
      }
      clockedSinceLabel={activeSince ? formatTime(activeSince, timeZone) : null}
    />
  );
}
