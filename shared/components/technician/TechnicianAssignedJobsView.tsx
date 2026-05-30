"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Briefcase, CheckCircle2, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import {
  groupTechnicianWorkQueue,
  sortActiveTechnicianJobs,
  sortCompletedTodayTechnicianJobs,
} from "@/shared/lib/technician-work-queue";
import {
  formatTechnicianLastUpdated,
  TECHNICIAN_PULL_REFRESH_EVENT,
} from "@/shared/lib/technician-refresh";
import type { JobStatus } from "@/shared/types/job";
import type { TechnicianJob } from "@/shared/types/technician";
import type {
  TechnicianTimeStateSnapshot,
  TodayTimeSummary,
} from "@/shared/types/time-entry";
import type { ServiceItem } from "@/shared/types/service-item";
import { TechnicianJobsTimeClock } from "./TechnicianJobsTimeClock";
import { TechnicianJobCard } from "./TechnicianJobCard";
import { TechnicianJobStatusBadge } from "./TechnicianJobStatusBadge";

type TechnicianAssignedJobsViewProps = {
  jobs: TechnicianJob[];
  timeState: TechnicianTimeStateSnapshot;
  todaySummary: TodayTimeSummary;
  serviceItems: ServiceItem[];
  canManageTime: boolean;
  canCreateEstimate: boolean;
  defaultTaxRate: number;
};

type WorkQueueSectionProps = {
  label: string;
  labelClassName?: string;
  jobs: TechnicianJob[];
  timeState: TechnicianTimeStateSnapshot;
  serviceItems: ServiceItem[];
  canCreateEstimate: boolean;
  defaultTaxRate: number;
  onTimeStateChange: (state: TechnicianTimeStateSnapshot) => void;
  onJobStatusUpdated: (jobId: string, status: JobStatus) => void;
  defaultExpanded?: boolean;
  emphasized?: boolean;
  wrapperClassName?: string;
};

function WorkQueueSection({
  label,
  labelClassName = "text-slate-500",
  jobs,
  timeState,
  serviceItems,
  canCreateEstimate,
  defaultTaxRate,
  onTimeStateChange,
  onJobStatusUpdated,
  defaultExpanded = false,
  emphasized = false,
  wrapperClassName,
}: WorkQueueSectionProps) {
  if (jobs.length === 0) {
    return null;
  }

  const content = (
    <>
      <p
        className={`px-1 text-xs font-semibold uppercase tracking-wide ${labelClassName}`}
      >
        {label}
      </p>
      <ul className="space-y-3">
        {jobs.map((job) => (
          <li key={job.id}>
            <TechnicianJobCard
              job={job}
              timeState={timeState}
              serviceItems={serviceItems}
              canCreateEstimate={canCreateEstimate}
              defaultTaxRate={defaultTaxRate}
              onTimeStateChange={onTimeStateChange}
              onStatusUpdated={(status) => onJobStatusUpdated(job.id, status)}
              defaultExpanded={defaultExpanded}
              emphasized={emphasized}
            />
          </li>
        ))}
      </ul>
    </>
  );

  if (wrapperClassName) {
    return (
      <section className={`space-y-3 ${wrapperClassName}`}>{content}</section>
    );
  }

  return <section className="space-y-3">{content}</section>;
}

function TechnicianJobsEmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <section className="min-h-[10rem] rounded-xl border border-dashed border-slate-300 bg-white px-4 py-8 text-center shadow-sm">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100">
        <Briefcase className="h-8 w-8 text-slate-400" />
      </div>

      <h3 className="mt-5 text-lg font-bold text-slate-900">{title}</h3>

      <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-slate-500">
        {description}
      </p>
    </section>
  );
}

function CompletedTodaySection({ jobs }: { jobs: TechnicianJob[] }) {
  const [expanded, setExpanded] = useState(false);
  const completedToday = sortCompletedTodayTechnicianJobs(jobs);

  if (completedToday.length === 0) {
    return null;
  }

  return (
    <section className="space-y-2 border-t border-slate-200/80 pt-4">
      <p className="px-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
        Completed Today
      </p>
      <button
        type="button"
        onClick={() => setExpanded((current) => !current)}
        aria-expanded={expanded}
        className="flex min-h-11 w-full touch-manipulation items-center justify-between rounded-lg bg-slate-50/80 px-3 py-2.5 ring-1 ring-slate-200/60"
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
        <ul className="space-y-2">
          {completedToday.map((job) => (
            <li
              key={job.id}
              className="flex min-h-11 items-center justify-between gap-3 rounded-lg bg-slate-50/60 px-3 py-2.5 ring-1 ring-slate-200/50"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-slate-700">
                  {job.jobNumber}
                </p>
                <p className="truncate text-xs text-slate-500">
                  {job.customerName}
                </p>
              </div>
              <TechnicianJobStatusBadge status={job.status} />
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

function TechnicianQueueSummary({
  activeCount,
  lastUpdatedAt,
  isRefreshing,
}: {
  activeCount: number;
  lastUpdatedAt: Date;
  isRefreshing: boolean;
}) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const interval = window.setInterval(() => setNow(new Date()), 15_000);
    return () => window.clearInterval(interval);
  }, []);

  return (
    <div className="rounded-xl bg-white px-3 py-2.5 shadow-sm ring-1 ring-slate-200 sm:px-4 sm:py-3">
      <div className="flex min-h-11 items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Today&apos;s queue
          </p>
          <p className="text-sm font-bold text-slate-900">
            {activeCount} active job{activeCount === 1 ? "" : "s"}
          </p>
        </div>
        <p
          className="shrink-0 text-right text-xs text-slate-500"
          aria-live="polite"
        >
          {isRefreshing ? (
            <span className="inline-flex items-center gap-1.5 font-medium text-cyan-700">
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
              Updating…
            </span>
          ) : (
            formatTechnicianLastUpdated(lastUpdatedAt, now)
          )}
        </p>
      </div>
    </div>
  );
}

export function TechnicianAssignedJobsView({
  jobs: initialJobs,
  timeState: initialTimeState,
  todaySummary: initialTodaySummary,
  serviceItems,
  canManageTime,
  canCreateEstimate,
  defaultTaxRate,
}: TechnicianAssignedJobsViewProps) {
  const router = useRouter();
  const [jobs, setJobs] = useState(initialJobs);
  const [timeState, setTimeState] = useState(initialTimeState);
  const [todaySummary, setTodaySummary] = useState(initialTodaySummary);
  const [lastUpdatedAt, setLastUpdatedAt] = useState(() => new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);

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
    setTodaySummary(initialTodaySummary);
  }, [initialTodaySummary]);

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

  const activeJobs = sortActiveTechnicianJobs(jobs);
  const { currentJobs, upNextJobs } = groupTechnicianWorkQueue(jobs);

  const timeClockBanner = canManageTime ? (
    <TechnicianJobsTimeClock
      initialTimeState={timeState}
      initialSummary={todaySummary}
      onTimeStateChange={setTimeState}
      onSummaryChange={setTodaySummary}
    />
  ) : null;

  if (activeJobs.length === 0) {
    return (
      <div className="space-y-4">
        {timeClockBanner}
        <TechnicianJobsEmptyState
          title={jobs.length === 0 ? "Nothing on your schedule" : "All caught up"}
          description={
            jobs.length === 0
              ? "When dispatch assigns you work, it will appear here automatically."
              : "No jobs need action right now. Finished work is listed below."
          }
        />
        <CompletedTodaySection jobs={jobs} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {timeClockBanner}

      <TechnicianQueueSummary
        activeCount={activeJobs.length}
        lastUpdatedAt={lastUpdatedAt}
        isRefreshing={isRefreshing}
      />

      <div className="space-y-6">
        <WorkQueueSection
          label="Current Job"
          labelClassName="text-cyan-700"
          jobs={currentJobs}
          timeState={timeState}
          serviceItems={serviceItems}
          canCreateEstimate={canCreateEstimate}
          defaultTaxRate={defaultTaxRate}
          onTimeStateChange={setTimeState}
          onJobStatusUpdated={handleJobStatusUpdated}
          defaultExpanded
          emphasized
          wrapperClassName="rounded-2xl border-2 border-cyan-200/90 bg-gradient-to-b from-cyan-50/70 to-white p-3 shadow-sm ring-1 ring-cyan-500/15 sm:p-4"
        />
        <WorkQueueSection
          label="Up Next"
          labelClassName="text-slate-500"
          jobs={upNextJobs}
          timeState={timeState}
          serviceItems={serviceItems}
          canCreateEstimate={canCreateEstimate}
          defaultTaxRate={defaultTaxRate}
          onTimeStateChange={setTimeState}
          onJobStatusUpdated={handleJobStatusUpdated}
          defaultExpanded={currentJobs.length === 0 && upNextJobs.length === 1}
        />
      </div>

      <CompletedTodaySection jobs={jobs} />
    </div>
  );
}
