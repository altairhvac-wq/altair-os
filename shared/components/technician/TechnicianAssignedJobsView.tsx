"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Briefcase, CheckCircle2, ChevronDown, ChevronUp } from "lucide-react";
import {
  groupTechnicianWorkQueue,
  sortActiveTechnicianJobs,
  sortCompletedTodayTechnicianJobs,
} from "@/shared/lib/technician-work-queue";
import type { JobStatus } from "@/shared/types/job";
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

type WorkQueueSectionProps = {
  label: string;
  labelClassName?: string;
  jobs: TechnicianJob[];
  timeState: TechnicianTimeStateSnapshot;
  serviceItems: ServiceItem[];
  onTimeStateChange: (state: TechnicianTimeStateSnapshot) => void;
  onJobStatusUpdated: (jobId: string, status: JobStatus) => void;
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
  onJobStatusUpdated,
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
              onStatusUpdated={(status) => onJobStatusUpdated(job.id, status)}
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
  const completedToday = sortCompletedTodayTechnicianJobs(jobs);

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
  jobs: initialJobs,
  timeState: initialTimeState,
  serviceItems,
}: TechnicianAssignedJobsViewProps) {
  const router = useRouter();
  const [jobs, setJobs] = useState(initialJobs);
  const [timeState, setTimeState] = useState(initialTimeState);

  useEffect(() => {
    setJobs(initialJobs);
  }, [initialJobs]);

  useEffect(() => {
    setTimeState(initialTimeState);
  }, [initialTimeState]);

  useEffect(() => {
    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        router.refresh();
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [router]);

  function handleJobStatusUpdated(jobId: string, status: JobStatus) {
    setJobs((current) =>
      current.map((job) => (job.id === jobId ? { ...job, status } : job)),
    );
  }

  const activeJobs = sortActiveTechnicianJobs(jobs);
  const { currentJobs, onSiteJobs, enRouteJobs, upNextJobs } =
    groupTechnicianWorkQueue(jobs);
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
          onJobStatusUpdated={handleJobStatusUpdated}
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
          onJobStatusUpdated={handleJobStatusUpdated}
          defaultExpanded={onSiteJobs.some((job) => job.id === primaryJobId)}
        />
        <WorkQueueSection
          label="En Route"
          jobs={enRouteJobs}
          timeState={timeState}
          serviceItems={serviceItems}
          onTimeStateChange={setTimeState}
          onJobStatusUpdated={handleJobStatusUpdated}
        />
        <WorkQueueSection
          label="Up Next"
          jobs={upNextJobs}
          timeState={timeState}
          serviceItems={serviceItems}
          onTimeStateChange={setTimeState}
          onJobStatusUpdated={handleJobStatusUpdated}
        />
      </div>

      <CompletedTodaySection jobs={jobs} />
    </div>
  );
}
