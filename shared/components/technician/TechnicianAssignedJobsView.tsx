"use client";

import { useEffect, useState } from "react";
import { Briefcase, CheckCircle2, ChevronDown, ChevronUp } from "lucide-react";
import { isSameCalendarDayInTimeZone } from "@/shared/lib/datetime";
import type { DispatchJobStatus } from "@/shared/types/dispatch";
import type { TechnicianJob } from "@/shared/types/technician";
import type { TechnicianTimeStateSnapshot } from "@/shared/types/time-entry";
import type { ServiceItem } from "@/shared/types/service-item";
import { TechnicianClockStatusBanner } from "./TechnicianClockStatusBanner";
import { TechnicianJobCard } from "./TechnicianJobCard";
import { TechnicianJobStatusBadge } from "./TechnicianJobStatusBadge";

type TechnicianAssignedJobsViewProps = {
  jobs: TechnicianJob[];
  timeState: TechnicianTimeStateSnapshot;
  serviceItems: ServiceItem[];
};

type ActiveJobStatus = Extract<
  DispatchJobStatus,
  "in_progress" | "arrived" | "dispatched" | "scheduled"
>;

const ACTIVE_STATUS_ORDER: Record<ActiveJobStatus, number> = {
  in_progress: 0,
  arrived: 1,
  dispatched: 2,
  scheduled: 3,
};

function isActiveTechnicianJob(job: TechnicianJob): boolean {
  return job.status !== "completed" && job.status !== "cancelled";
}

function isCompletedToday(job: TechnicianJob, now = new Date()): boolean {
  if (job.status !== "completed") {
    return false;
  }

  const completedAt = job.completedAt ?? job.scheduledDate;
  return isSameCalendarDayInTimeZone(completedAt, now);
}

function getActiveStatusOrder(status: TechnicianJob["status"]): number {
  return ACTIVE_STATUS_ORDER[status as ActiveJobStatus] ?? 99;
}

function compareActiveJobs(a: TechnicianJob, b: TechnicianJob): number {
  const statusDiff = getActiveStatusOrder(a.status) - getActiveStatusOrder(b.status);

  if (statusDiff !== 0) {
    return statusDiff;
  }

  return (
    new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime()
  );
}

function sortActiveJobs(jobs: TechnicianJob[]): TechnicianJob[] {
  return jobs.filter(isActiveTechnicianJob).sort(compareActiveJobs);
}

function groupWorkQueue(jobs: TechnicianJob[]) {
  const sorted = sortActiveJobs(jobs);

  return {
    currentJobs: sorted.filter((job) => job.status === "in_progress"),
    onSiteJobs: sorted.filter((job) => job.status === "arrived"),
    enRouteJobs: sorted.filter((job) => job.status === "dispatched"),
    upNextJobs: sorted.filter((job) => job.status === "scheduled"),
  };
}

type WorkQueueSectionProps = {
  label: string;
  labelClassName?: string;
  jobs: TechnicianJob[];
  timeState: TechnicianTimeStateSnapshot;
  serviceItems: ServiceItem[];
  onTimeStateChange: (state: TechnicianTimeStateSnapshot) => void;
  defaultExpanded?: boolean;
  emphasized?: boolean;
};

function WorkQueueSection({
  label,
  labelClassName = "text-slate-500",
  jobs,
  timeState,
  serviceItems,
  onTimeStateChange,
  defaultExpanded = false,
  emphasized = false,
}: WorkQueueSectionProps) {
  if (jobs.length === 0) {
    return null;
  }

  return (
    <section className="space-y-3">
      <p
        className={`px-1 text-xs font-semibold uppercase tracking-wide ${labelClassName}`}
      >
        {label}
      </p>
      <ul className="space-y-4">
        {jobs.map((job) => (
          <li key={job.id}>
            <TechnicianJobCard
              job={job}
              timeState={timeState}
              serviceItems={serviceItems}
              onTimeStateChange={onTimeStateChange}
              defaultExpanded={defaultExpanded}
              emphasized={emphasized}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}

function TechnicianJobsEmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <section className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center shadow-sm">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100">
        <Briefcase className="h-8 w-8 text-slate-400" />
      </div>

      <h3 className="mt-5 text-lg font-bold text-slate-900">{title}</h3>

      <p className="mx-auto mt-2 max-w-xs text-sm text-slate-500">
        {description}
      </p>
    </section>
  );
}

function CompletedTodaySection({ jobs }: { jobs: TechnicianJob[] }) {
  const [expanded, setExpanded] = useState(false);
  const completedToday = jobs
    .filter((job) => isCompletedToday(job))
    .sort(
      (a, b) =>
        new Date(b.completedAt ?? b.scheduledDate).getTime() -
        new Date(a.completedAt ?? a.scheduledDate).getTime(),
    );

  if (completedToday.length === 0) {
    return null;
  }

  return (
    <section className="space-y-3">
      <button
        type="button"
        onClick={() => setExpanded((current) => !current)}
        className="flex min-h-11 w-full items-center justify-between rounded-xl bg-white px-3 py-2.5 shadow-sm ring-1 ring-slate-200"
      >
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          <span className="text-sm font-semibold text-slate-900">
            Completed today ({completedToday.length})
          </span>
        </div>
        {expanded ? (
          <ChevronUp className="h-4 w-4 text-slate-400" />
        ) : (
          <ChevronDown className="h-4 w-4 text-slate-400" />
        )}
      </button>
      {expanded ? (
        <ul className="space-y-2">
          {completedToday.map((job) => (
            <li
              key={job.id}
              className="flex items-center justify-between gap-3 rounded-xl bg-white px-3 py-3 ring-1 ring-slate-200"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-900">
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

export function TechnicianAssignedJobsView({
  jobs,
  timeState: initialTimeState,
  serviceItems,
}: TechnicianAssignedJobsViewProps) {
  const [timeState, setTimeState] = useState(initialTimeState);

  useEffect(() => {
    setTimeState(initialTimeState);
  }, [initialTimeState]);

  const activeJobs = sortActiveJobs(jobs);
  const { currentJobs, onSiteJobs, enRouteJobs, upNextJobs } =
    groupWorkQueue(jobs);
  const primaryJobId = currentJobs[0]?.id ?? onSiteJobs[0]?.id;

  if (activeJobs.length === 0) {
    return (
      <div className="space-y-4">
        <TechnicianClockStatusBanner timeState={timeState} />
        <TechnicianJobsEmptyState
          title={jobs.length === 0 ? "No assigned jobs" : "No active jobs"}
          description={
            jobs.length === 0
              ? "When dispatch assigns you work, it will show up here."
              : "You're all caught up. New assignments will appear in your queue."
          }
        />
        <CompletedTodaySection jobs={jobs} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <TechnicianClockStatusBanner timeState={timeState} />

      <div className="rounded-xl bg-white px-3 py-2.5 shadow-sm ring-1 ring-slate-200 sm:px-4 sm:py-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          My Jobs
        </p>
        <p className="text-sm font-bold text-slate-900">
          {activeJobs.length} active job{activeJobs.length === 1 ? "" : "s"}
        </p>
      </div>

      <div className="space-y-6">
        <WorkQueueSection
          label="Current Job"
          labelClassName="text-cyan-600"
          jobs={currentJobs}
          timeState={timeState}
          serviceItems={serviceItems}
          onTimeStateChange={setTimeState}
          defaultExpanded
          emphasized
        />
        <WorkQueueSection
          label="On Site"
          labelClassName="text-teal-600"
          jobs={onSiteJobs}
          timeState={timeState}
          serviceItems={serviceItems}
          onTimeStateChange={setTimeState}
          defaultExpanded={onSiteJobs.some((job) => job.id === primaryJobId)}
        />
        <WorkQueueSection
          label="En Route"
          jobs={enRouteJobs}
          timeState={timeState}
          serviceItems={serviceItems}
          onTimeStateChange={setTimeState}
        />
        <WorkQueueSection
          label="Up Next"
          jobs={upNextJobs}
          timeState={timeState}
          serviceItems={serviceItems}
          onTimeStateChange={setTimeState}
        />
      </div>

      <CompletedTodaySection jobs={jobs} />
    </div>
  );
}
