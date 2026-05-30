"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Briefcase, CheckCircle2, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import {
  getTechnicianJobDeckOrder,
  sortCompletedTodayTechnicianJobs,
} from "@/shared/lib/technician-work-queue";
import {
  formatTechnicianLastUpdated,
  TECHNICIAN_PULL_REFRESH_EVENT,
} from "@/shared/lib/technician-refresh";
import type { JobBillingSummariesByJobId } from "@/shared/lib/job-next-business-action";
import type { JobStatus } from "@/shared/types/job";
import type { TechnicianJob } from "@/shared/types/technician";
import type {
  TechnicianTimeStateSnapshot,
} from "@/shared/types/time-entry";
import type { ServiceItem } from "@/shared/types/service-item";
import { TechnicianClockStatusBanner } from "./TechnicianClockStatusBanner";
import { TechnicianJobDeck } from "./TechnicianJobDeck";
import { TechnicianJobStatusBadge } from "./TechnicianJobStatusBadge";

type TechnicianAssignedJobsViewProps = {
  jobs: TechnicianJob[];
  timeState: TechnicianTimeStateSnapshot;
  serviceItems: ServiceItem[];
  canManageTime: boolean;
  canCreateEstimate: boolean;
  canViewBilling: boolean;
  billingSummaries: JobBillingSummariesByJobId;
  defaultTaxRate: number;
  companyTimeZone: string;
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
}: {
  jobs: TechnicianJob[];
  companyTimeZone: string;
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
        <ul className="space-y-2">
          {completedToday.map((job) => (
            <li
              key={job.id}
              className="flex min-h-11 items-center justify-between gap-3 rounded-lg bg-white px-3 py-2.5 ring-1 ring-slate-200/50"
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
    <div
      className="flex min-h-8 items-center justify-between gap-2 px-1 text-xs"
      aria-live="polite"
    >
      <p className="font-medium text-slate-600">
        {activeCount} open job{activeCount === 1 ? "" : "s"}
      </p>
      <p className="shrink-0 text-slate-400">
        {isRefreshing ? (
          <span className="inline-flex items-center gap-1 font-medium text-slate-600">
            <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
            Updating…
          </span>
        ) : (
          formatTechnicianLastUpdated(lastUpdatedAt, now)
        )}
      </p>
    </div>
  );
}

export function TechnicianAssignedJobsView({
  jobs: initialJobs,
  timeState: initialTimeState,
  serviceItems,
  canManageTime,
  canCreateEstimate,
  canViewBilling,
  billingSummaries,
  defaultTaxRate,
  companyTimeZone,
}: TechnicianAssignedJobsViewProps) {
  const router = useRouter();
  const [jobs, setJobs] = useState(initialJobs);
  const [timeState, setTimeState] = useState(initialTimeState);
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

  const deckJobs = getTechnicianJobDeckOrder(jobs);

  if (deckJobs.length === 0) {
    return (
      <div className="space-y-3">
        <TechnicianJobsEmptyState
          title={jobs.length === 0 ? "Nothing on your schedule" : "All caught up"}
          description={
            jobs.length === 0
              ? "When dispatch assigns you work, it will appear here automatically."
              : "No jobs need action right now. Finished work is listed below."
          }
        />
        <CompletedTodaySection jobs={jobs} companyTimeZone={companyTimeZone} />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {canManageTime ? (
        <TechnicianClockStatusBanner timeState={timeState} />
      ) : null}

      <TechnicianQueueSummary
        activeCount={deckJobs.length}
        lastUpdatedAt={lastUpdatedAt}
        isRefreshing={isRefreshing}
      />

      <TechnicianJobDeck
        jobs={deckJobs}
        timeState={timeState}
        serviceItems={serviceItems}
        canCreateEstimate={canCreateEstimate}
        canViewBilling={canViewBilling}
        billingSummaries={billingSummaries}
        canManageTime={canManageTime}
        defaultTaxRate={defaultTaxRate}
        onTimeStateChange={setTimeState}
        onJobStatusUpdated={handleJobStatusUpdated}
      />

      <CompletedTodaySection jobs={jobs} companyTimeZone={companyTimeZone} />
    </div>
  );
}
