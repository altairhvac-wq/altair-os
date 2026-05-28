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
import { CustomerSearchResultCard } from "./CustomerSearchResultCard";
import { JobDetailsPanel } from "./JobDetailsPanel";
import { JobSearchFilterBar } from "./JobSearchFilterBar";
import { JobsEmptyState } from "./JobsEmptyState";
import { JobsTable } from "./JobsTable";
import { JobsTodayCardList } from "./JobsTodayCardList";
import { JobsViewTabs } from "./JobsViewTabs";

type PanelMode = "detail" | "create" | "empty";
type JobsViewTab = "today" | "all";

type JobsPageViewProps = {
  initialJobs: Job[];
  customers: Customer[];
  canDispatchJobs: boolean;
  initialPanelMode?: PanelMode;
  createInitialData?: Partial<JobFormData>;
};

function isJobScheduledToday(job: Job, reference = new Date()): boolean {
  const scheduled = new Date(job.scheduledDate);
  return (
    scheduled.getFullYear() === reference.getFullYear() &&
    scheduled.getMonth() === reference.getMonth() &&
    scheduled.getDate() === reference.getDate()
  );
}

function sortJobsByScheduledTime(jobs: Job[]): Job[] {
  return [...jobs].sort(
    (a, b) =>
      new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime(),
  );
}

function filterAllJobs(
  jobs: Job[],
  statusFilter: JobStatus | "all",
  priorityFilter: JobPriority | "all",
): Job[] {
  return jobs.filter((job) => {
    const matchesStatus =
      statusFilter === "all" || job.status === statusFilter;
    const matchesPriority =
      priorityFilter === "all" || job.priority === priorityFilter;

    return matchesStatus && matchesPriority;
  });
}

function filterCustomers(customers: Customer[], search: string): Customer[] {
  const query = search.trim().toLowerCase();
  if (!query) return [];

  return customers.filter((customer) => {
    const haystack = [
      customer.name,
      customer.email,
      customer.phone,
      customer.company ?? "",
      customer.city,
      customer.state,
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
  const [viewTab, setViewTab] = useState<JobsViewTab>("today");
  const [statusFilter, setStatusFilter] = useState<JobStatus | "all">("all");
  const [priorityFilter, setPriorityFilter] = useState<JobPriority | "all">(
    "all",
  );
  const [panelMode, setPanelMode] = useState<PanelMode>(initialPanelMode);
  const [createError, setCreateError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const todayJobs = useMemo(
    () => sortJobsByScheduledTime(jobs.filter((job) => isJobScheduledToday(job))),
    [jobs],
  );

  const filteredAllJobs = useMemo(
    () => sortJobsByScheduledTime(filterAllJobs(jobs, statusFilter, priorityFilter)),
    [jobs, statusFilter, priorityFilter],
  );

  const filteredCustomers = useMemo(
    () => filterCustomers(customers, search),
    [customers, search],
  );

  const isSearching = search.trim().length > 0;

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
  const showCustomerSearch = isSearching && customers.length > 0;
  const showCustomerSearchUnavailable = isSearching && customers.length === 0;

  function renderMainContent() {
    if (showCustomerSearch) {
      if (filteredCustomers.length === 0) {
        return <JobsEmptyState variant="no-customer-search-results" />;
      }

      return (
        <ul className="divide-y divide-slate-100">
          {filteredCustomers.map((customer) => (
            <li key={customer.id}>
              <CustomerSearchResultCard customer={customer} />
            </li>
          ))}
        </ul>
      );
    }

    if (showCustomerSearchUnavailable) {
      return <JobsEmptyState variant="no-company-customers" />;
    }

    if (viewTab === "today") {
      if (hasNoJobs) {
        return (
          <JobsEmptyState
            variant="no-jobs"
            onCreateJob={canDispatchJobs ? handleNewJob : undefined}
          />
        );
      }

      if (todayJobs.length === 0) {
        return (
          <JobsEmptyState
            variant="no-jobs-today"
            onCreateJob={canDispatchJobs ? handleNewJob : undefined}
          />
        );
      }

      return <JobsTodayCardList jobs={todayJobs} onSelect={handleSelectJob} />;
    }

    if (hasNoJobs) {
      return (
        <JobsEmptyState
          variant="no-jobs"
          onCreateJob={canDispatchJobs ? handleNewJob : undefined}
        />
      );
    }

    if (filteredAllJobs.length === 0) {
      return <JobsEmptyState variant="no-results" />;
    }

    return <JobsTable jobs={filteredAllJobs} onSelect={handleSelectJob} />;
  }

  return (
    <div className="flex min-h-0 min-w-0 max-w-full flex-col gap-4 lg:h-[calc(100dvh-9.5rem)] lg:flex-row lg:overflow-hidden">
      <section
        className={`${listDetailListSectionClassName} flex min-h-[16rem] min-w-0 flex-[1_1_55%] flex-col admin-card lg:min-h-0 lg:flex-1 lg:overflow-hidden ${panelMode === "create" ? "max-lg:hidden" : ""}`}
      >
        <div className="flex shrink-0 flex-wrap items-start justify-between gap-3 border-b border-slate-100 px-4 py-4">
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-bold text-slate-900">Jobs</h2>
            <p className="text-xs text-slate-500">
              {isSearching
                ? "Find a customer to view their full job history"
                : viewTab === "today"
                  ? `${todayJobs.length} scheduled today`
                  : "Browse all scheduled and completed work"}
            </p>
          </div>
          {canDispatchJobs ? (
            <button
              type="button"
              onClick={handleNewJob}
              disabled={customers.length === 0}
              className="inline-flex shrink-0 items-center gap-2 admin-btn-primary disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Plus className="h-4 w-4" />
              New Job
            </button>
          ) : null}
        </div>

        <div className="shrink-0 space-y-3 px-4 pt-3">
          {!isSearching ? (
            <JobsViewTabs
              activeTab={viewTab}
              onTabChange={setViewTab}
              todayCount={todayJobs.length}
              allCount={jobs.length}
            />
          ) : null}
        </div>

        <div className="shrink-0">
          <JobSearchFilterBar
            search={search}
            onSearchChange={setSearch}
            resultCount={
              isSearching ? filteredCustomers.length : filteredAllJobs.length
            }
            resultLabel={isSearching ? "customers" : "jobs"}
            statusFilter={statusFilter}
            priorityFilter={priorityFilter}
            onStatusFilterChange={setStatusFilter}
            onPriorityFilterChange={setPriorityFilter}
            showJobFilters={!isSearching && viewTab === "all" && !hasNoJobs}
          />
        </div>

        <div className="min-h-0 min-w-0 flex-1 overflow-x-hidden lg:overflow-y-auto">
          {renderMainContent()}
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
