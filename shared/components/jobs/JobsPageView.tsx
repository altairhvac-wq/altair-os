"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { mockJobs } from "@/shared/data/mock-jobs";
import {
  type Job,
  type JobFormData,
  type JobPriority,
  type JobStatus,
} from "@/shared/types/job";
import { JobDetailsPanel } from "./JobDetailsPanel";
import { JobSearchFilterBar } from "./JobSearchFilterBar";
import { JobsEmptyState } from "./JobsEmptyState";
import { JobsLoadingState } from "./JobsLoadingState";
import { JobsTable } from "./JobsTable";

type PanelMode = "detail" | "create" | "empty";

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

function formDataToJob(data: JobFormData, existingCount: number): Job {
  const jobNumber = `JOB-${1048 + existingCount}`;

  return {
    id: `job-${Date.now()}`,
    jobNumber,
    customerId: `cust-new-${Date.now()}`,
    customerName: data.customerName,
    serviceAddress: data.serviceAddress,
    city: data.city,
    state: data.state,
    zip: data.zip,
    jobType: data.jobType,
    assignedTechnician: data.assignedTechnician || undefined,
    scheduledDate: new Date(data.scheduledDate).toISOString(),
    status: data.status,
    priority: data.priority,
    description: data.description || undefined,
    notes: data.notes || undefined,
    createdAt: new Date().toISOString().split("T")[0],
  };
}

export function JobsPageView() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<JobStatus | "all">("all");
  const [priorityFilter, setPriorityFilter] = useState<JobPriority | "all">(
    "all",
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [panelMode, setPanelMode] = useState<PanelMode>("empty");

  useEffect(() => {
    const timer = setTimeout(() => {
      setJobs(mockJobs);
      setIsLoading(false);
    }, 600);

    return () => clearTimeout(timer);
  }, []);

  const filteredJobs = useMemo(
    () => filterJobs(jobs, search, statusFilter, priorityFilter),
    [jobs, search, statusFilter, priorityFilter],
  );

  const selectedJob = jobs.find((j) => j.id === selectedId) ?? null;

  function handleSelectJob(job: Job) {
    setSelectedId(job.id);
    setPanelMode("detail");
  }

  function handleNewJob() {
    setSelectedId(null);
    setPanelMode("create");
  }

  function handleClosePanel() {
    setSelectedId(null);
    setPanelMode("empty");
  }

  function handleCreateSubmit(data: JobFormData) {
    const newJob = formDataToJob(data, jobs.length);
    setJobs((prev) => [newJob, ...prev]);
    setSelectedId(newJob.id);
    setPanelMode("detail");
  }

  if (isLoading) {
    return <JobsLoadingState />;
  }

  const hasNoJobs = jobs.length === 0;
  const hasNoResults = !hasNoJobs && filteredJobs.length === 0;

  return (
    <div className="flex h-[calc(100vh-7rem)] flex-col gap-4 overflow-hidden lg:flex-row">
      <section className="flex min-h-[16rem] min-w-0 flex-[1_1_55%] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm lg:min-h-0 lg:flex-1">
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">All jobs</h2>
            <p className="text-xs text-slate-500">
              Schedule work, assign technicians, and track status
            </p>
          </div>
          <button
            type="button"
            onClick={handleNewJob}
            className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-cyan-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-cyan-700"
          >
            <Plus className="h-4 w-4" />
            New Job
          </button>
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

        <div className="min-h-0 flex-1 overflow-y-auto">
          {hasNoJobs ? (
            <JobsEmptyState variant="no-jobs" onCreateJob={handleNewJob} />
          ) : hasNoResults ? (
            <JobsEmptyState variant="no-results" />
          ) : (
            <JobsTable
              jobs={filteredJobs}
              selectedId={selectedId}
              onSelect={handleSelectJob}
            />
          )}
        </div>
      </section>

      <JobDetailsPanel
        mode={panelMode}
        job={selectedJob}
        onClose={handleClosePanel}
        onCreateSubmit={handleCreateSubmit}
        onCreateCancel={handleClosePanel}
      />
    </div>
  );
}
