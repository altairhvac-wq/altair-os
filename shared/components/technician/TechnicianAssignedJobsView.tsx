"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Briefcase, CheckCircle2, ChevronDown, ChevronUp } from "lucide-react";
import {
  filterJobsForTechnicianScheduleDay,
  formatTechnicianScheduleDayHeading,
  formatTechnicianScheduleCaughtUpDescription,
  formatTechnicianScheduleEmptyDescription,
  formatTechnicianScheduleEmptyTitle,
  formatTechnicianScheduleQueueLabel,
  getTechnicianTodayDateOnly,
  isSelectedTechnicianScheduleDayToday,
  type TechnicianScheduleDayContext,
} from "@/shared/lib/technician-week-schedule";
import {
  getTechnicianJobDeckOrder,
  sortCompletedTodayTechnicianJobs,
} from "@/shared/lib/technician-work-queue";
import { TECHNICIAN_PULL_REFRESH_EVENT } from "@/shared/lib/technician-refresh";
import type { JobBillingSummariesByJobId } from "@/shared/lib/job-next-business-action";
import type { JobStatus } from "@/shared/types/job";
import type { TechnicianJob } from "@/shared/types/technician";
import type {
  TechnicianTimeStateSnapshot,
} from "@/shared/types/time-entry";
import type { ServiceItem } from "@/shared/types/service-item";
import { DispatchJobCard } from "@/shared/components/dispatch/DispatchJobCard";
import { technicianJobToDispatchJob } from "@/shared/lib/technician-dispatch-job";
import { TechnicianClockStatusBanner } from "./TechnicianClockStatusBanner";
import { TechnicianJobDetailOverlay } from "./TechnicianJobDetailOverlay";
import { TechnicianJobList } from "./TechnicianJobList";
import { TechnicianWeekStrip } from "./TechnicianWeekStrip";

type TechnicianAssignedJobsViewProps = {
  jobs: TechnicianJob[];
  timeState: TechnicianTimeStateSnapshot;
  serviceItems: ServiceItem[];
  canManageTime: boolean;
  canCreateEstimate: boolean;
  canApproveOnSite: boolean;
  canViewBilling: boolean;
  billingSummaries: JobBillingSummariesByJobId;
  defaultTaxRate: number;
  companyTimeZone: string;
  aiFeaturesEnabled?: boolean;
};

function TechnicianJobsEmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <section className="min-h-[8rem] rounded-lg border border-dashed border-slate-300 bg-white px-3 py-6 text-center shadow-sm">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100">
        <Briefcase className="h-6 w-6 text-slate-400" />
      </div>

      <h3 className="mt-3 text-base font-bold text-slate-900">{title}</h3>

      <p className="mx-auto mt-1 max-w-xs text-sm text-slate-500">
        {description}
      </p>
    </section>
  );
}

function CompletedTodaySection({
  jobs,
  companyTimeZone,
  selectedJobId,
  onSelectJob,
}: {
  jobs: TechnicianJob[];
  companyTimeZone: string;
  selectedJobId: string | null;
  onSelectJob: (job: TechnicianJob) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const completedToday = sortCompletedTodayTechnicianJobs(jobs, {
    timeZone: companyTimeZone,
  });

  if (completedToday.length === 0) {
    return null;
  }

  return (
    <section className="space-y-1.5 border-t border-slate-200/80 pt-3">
      <p className="px-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
        Done today
      </p>
      <button
        type="button"
        onClick={() => setExpanded((current) => !current)}
        aria-expanded={expanded}
        className="flex min-h-11 w-full touch-manipulation items-center justify-between rounded-lg bg-white px-3 py-2.5 ring-1 ring-slate-200/60"
      >
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-slate-400" />
          <span className="text-sm font-medium text-slate-600">
            {completedToday.length} finished
            {completedToday.length === 1 ? "" : " today"}
          </span>
        </div>
        {expanded ? (
          <ChevronUp className="h-4 w-4 text-slate-400" aria-hidden />
        ) : (
          <ChevronDown className="h-4 w-4 text-slate-400" aria-hidden />
        )}
      </button>
      {expanded ? (
        <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
          {completedToday.map((job) => (
            <li key={job.id} className="min-w-0">
              <DispatchJobCard
                job={technicianJobToDispatchJob(job)}
                compact={false}
                hideTechnician
                isSelected={selectedJobId === job.id}
                className="w-full opacity-90"
                onSelect={() => onSelectJob(job)}
              />
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

export function TechnicianAssignedJobsView({
  jobs: initialJobs,
  timeState: initialTimeState,
  serviceItems,
  canManageTime,
  canCreateEstimate,
  canApproveOnSite,
  canViewBilling,
  billingSummaries,
  defaultTaxRate,
  companyTimeZone,
  aiFeaturesEnabled = false,
}: TechnicianAssignedJobsViewProps) {
  const router = useRouter();
  const [jobs, setJobs] = useState(initialJobs);
  const [timeState, setTimeState] = useState(initialTimeState);
  const [lastUpdatedAt, setLastUpdatedAt] = useState(() => new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const scheduleContext: TechnicianScheduleDayContext = {
    timeZone: companyTimeZone,
    todayDateOnly: getTechnicianTodayDateOnly(companyTimeZone),
    reference: new Date(),
  };
  const [selectedDateOnly, setSelectedDateOnly] = useState(
    () => scheduleContext.todayDateOnly,
  );
  const [selectedJob, setSelectedJob] = useState<TechnicianJob | null>(null);

  const markRefreshComplete = useCallback(() => {
    setIsRefreshing(false);
    setLastUpdatedAt(new Date());
  }, []);

  const beginRefresh = useCallback(() => {
    setIsRefreshing(true);
    router.refresh();
  }, [router]);

  useEffect(() => {
    setJobs(initialJobs);
    markRefreshComplete();
  }, [initialJobs, markRefreshComplete]);

  useEffect(() => {
    setTimeState(initialTimeState);
  }, [initialTimeState]);

  useEffect(() => {
    if (!isRefreshing) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setIsRefreshing(false);
    }, 10_000);

    return () => window.clearTimeout(timeout);
  }, [isRefreshing]);

  useEffect(() => {
    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        beginRefresh();
      }
    }

    function handlePullRefresh() {
      setIsRefreshing(true);
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener(TECHNICIAN_PULL_REFRESH_EVENT, handlePullRefresh);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener(
        TECHNICIAN_PULL_REFRESH_EVENT,
        handlePullRefresh,
      );
    };
  }, [beginRefresh]);

  function handleJobStatusUpdated(jobId: string, status: JobStatus) {
    setJobs((current) =>
      current.map((job) => (job.id === jobId ? { ...job, status } : job)),
    );
  }

  function handleSelectJob(job: TechnicianJob) {
    setSelectedJob(job);
  }

  function handleCloseJobDetail() {
    setSelectedJob(null);
  }

  const selectedJobRecord = selectedJob
    ? (jobs.find((job) => job.id === selectedJob.id) ?? selectedJob)
    : null;

  const selectedDayJobs = filterJobsForTechnicianScheduleDay(
    jobs,
    selectedDateOnly,
    scheduleContext,
  );
  const deckJobs = getTechnicianJobDeckOrder(selectedDayJobs);
  const dayHeading = formatTechnicianScheduleDayHeading(
    selectedDateOnly,
    scheduleContext,
  );
  const queueLabel = formatTechnicianScheduleQueueLabel({
    dateOnly: selectedDateOnly,
    activeCount: deckJobs.length,
    context: scheduleContext,
  });
  const showCompletedToday = isSelectedTechnicianScheduleDayToday(
    selectedDateOnly,
    scheduleContext,
  );

  const showQueueSummary = deckJobs.length > 0;

  return (
    <div className="space-y-2">
      <TechnicianWeekStrip
        jobs={jobs}
        selectedDateOnly={selectedDateOnly}
        scheduleContext={scheduleContext}
        onSelectDateOnly={setSelectedDateOnly}
        dayHeading={showQueueSummary ? dayHeading : undefined}
        queueLabel={showQueueSummary ? queueLabel : undefined}
        lastUpdatedAt={showQueueSummary ? lastUpdatedAt : undefined}
        isRefreshing={showQueueSummary ? isRefreshing : undefined}
      />

      {deckJobs.length === 0 ? (
        <>
          <TechnicianJobsEmptyState
            title={
              jobs.length === 0
                ? "Nothing on your schedule"
                : formatTechnicianScheduleEmptyTitle(
                    selectedDateOnly,
                    scheduleContext,
                  )
            }
            description={
              jobs.length === 0
                ? "When dispatch assigns you work, it will appear here automatically."
                : selectedDayJobs.length > 0
                  ? formatTechnicianScheduleCaughtUpDescription(
                      selectedDateOnly,
                      scheduleContext,
                    )
                  : formatTechnicianScheduleEmptyDescription(
                      selectedDateOnly,
                      scheduleContext,
                    )
            }
          />
          {showCompletedToday ? (
            <CompletedTodaySection
              jobs={jobs}
              companyTimeZone={companyTimeZone}
              selectedJobId={selectedJob?.id ?? null}
              onSelectJob={handleSelectJob}
            />
          ) : null}
        </>
      ) : (
        <>
          {canManageTime ? (
            <TechnicianClockStatusBanner timeState={timeState} />
          ) : null}

          <TechnicianJobList
            deckKey={selectedDateOnly}
            jobs={deckJobs}
            selectedJobId={selectedJob?.id ?? null}
            timeState={timeState}
            onSelectJob={handleSelectJob}
          />

          {showCompletedToday ? (
            <CompletedTodaySection
              jobs={jobs}
              companyTimeZone={companyTimeZone}
              selectedJobId={selectedJob?.id ?? null}
              onSelectJob={handleSelectJob}
            />
          ) : null}
        </>
      )}

      {selectedJobRecord ? (
        <TechnicianJobDetailOverlay
          job={selectedJobRecord}
          timeState={timeState}
          serviceItems={serviceItems}
          canCreateEstimate={canCreateEstimate}
          canApproveOnSite={canApproveOnSite}
          canViewBilling={canViewBilling}
          aiFeaturesEnabled={aiFeaturesEnabled}
          billingSummaries={billingSummaries}
          canManageTime={canManageTime}
          defaultTaxRate={defaultTaxRate}
          onClose={handleCloseJobDetail}
          onJobStatusUpdated={handleJobStatusUpdated}
        />
      ) : null}
    </div>
  );
}
