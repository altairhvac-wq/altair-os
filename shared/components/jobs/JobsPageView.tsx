"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { createJobAction } from "@/app/actions/jobs";
import type { Customer } from "@/shared/types/customer";
import {
  type Job,
  type JobFormData,
  type JobPriority,
  type JobStatus,
} from "@/shared/types/job";
import { listDetailListSectionClassName } from "@/shared/components/layout/list-detail-layout";
import { JobDetailsPanel } from "./JobDetailsPanel";
import { JobSearchFilterBar } from "./JobSearchFilterBar";
import { JobsEmptyState } from "./JobsEmptyState";
import { JobsTable } from "./JobsTable";

type PanelMode = "detail" | "create" | "empty";

type JobsPageViewProps = {
  initialJobs: Job[];
  customers: Customer[];
  canDispatchJobs: boolean;
  initialPanelMode?: PanelMode;
  createInitialData?: Partial<JobFormData>;
};

function filterJobs(
  jobs: Job[],
  search: string,
  statusFilter: JobStatus | "all",
  priorityFilter: JobPriority | "all",
): Job[] {
  const query = search.trim().toLowerCase();

  return jobs.filter((job) => {
    const matchesStatus =
      statusFilter === "all" || job.status === statusFilter;
    const matchesPriority =
      priorityFilter === "all" || job.priority === priorityFilter;

    if (!matchesStatus || !matchesPriority) return false;
    if (!query) return true;

    const haystack = [
      job.jobNumber,
      job.customerName,
      job.serviceAddress,
      job.city,
      job.state,
      job.jobType,
      job.assignedTechnician ?? "",
    ]
      .join(" ")
      .toLowerCase();

    return haystack.includes(query);
  });
}

export function JobsPageView({
  initialJobs,
  customers,
  canDispatchJobs,
  initialPanelMode = "empty",
  createInitialData,
}: JobsPageViewProps) {
  const [jobs, setJobs] = useState(initialJobs);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<JobStatus | "all">("all");
  const [priorityFilter, setPriorityFilter] = useState<JobPriority | "all">(
    "all",
  );
  const [panelMode, setPanelMode] = useState<PanelMode>(initialPanelMode);
  const [createError, setCreateError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const filteredJobs = useMemo(
    () => filterJobs(jobs, search, statusFilter, priorityFilter),
    [jobs, search, statusFilter, priorityFilter],
  );

  function handleSelectJob(job: Job) {
    router.push(`/jobs/${job.id}`);
  }

  function handleNewJob() {
    if (!canDispatchJobs) {
      return;
    }

    setPanelMode("create");
    setCreateError(null);
  }

  function handleClosePanel() {
    setPanelMode("empty");
    setCreateError(null);
  }

  function handleCreateSubmit(data: JobFormData) {
    setCreateError(null);

    startTransition(async () => {
      const result = await createJobAction(data);

      if (result.error || !result.job) {
        setCreateError(result.error ?? "Failed to create job.");
        return;
      }

      setJobs((previous) => [result.job!, ...previous]);
      setPanelMode("empty");
      router.push(`/jobs/${result.job.id}`);
    });
  }

  const hasNoJobs = jobs.length === 0;
  const hasNoResults = !hasNoJobs && filteredJobs.length === 0;

  return (
    <div className="flex flex-col gap-4 lg:h-[calc(100dvh-7rem)] lg:flex-row lg:overflow-hidden">
      <section className={`${listDetailListSectionClassName} flex min-h-[16rem] min-w-0 flex-[1_1_55%] flex-col lg:overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm lg:min-h-0 lg:flex-1`}>
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">All jobs</h2>
            <p className="text-xs text-slate-500">
              Schedule work, assign technicians, and track status
            </p>
          </div>
          {canDispatchJobs ? (
            <button
              type="button"
              onClick={handleNewJob}
              disabled={customers.length === 0}
              className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-cyan-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-cyan-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Plus className="h-4 w-4" />
              New Job
            </button>
          ) : null}
        </div>

        {!hasNoJobs ? (
          <div className="shrink-0">
            <JobSearchFilterBar
              search={search}
              statusFilter={statusFilter}
              priorityFilter={priorityFilter}
              onSearchChange={setSearch}
              onStatusFilterChange={setStatusFilter}
              onPriorityFilterChange={setPriorityFilter}
              resultCount={filteredJobs.length}
            />
          </div>
        ) : null}

        <div className="min-h-0 flex-1 lg:overflow-y-auto">
          {hasNoJobs ? (
            <JobsEmptyState
              variant="no-jobs"
              onCreateJob={canDispatchJobs ? handleNewJob : undefined}
            />
          ) : hasNoResults ? (
            <JobsEmptyState variant="no-results" />
          ) : (
            <JobsTable jobs={filteredJobs} onSelect={handleSelectJob} />
          )}
        </div>
      </section>

      <JobDetailsPanel
        mode={panelMode}
        job={null}
        customers={customers}
        onClose={handleClosePanel}
        onCreateSubmit={handleCreateSubmit}
        onCreateCancel={handleClosePanel}
        createError={createError}
        isSubmitting={isPending}
        createInitialData={createInitialData}
      />
    </div>
  );
}
