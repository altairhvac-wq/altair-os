"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus } from "lucide-react";
import {
  bulkAssignJobsAction,
  bulkUpdateJobStatusAction,
} from "@/app/actions/jobs-bulk";
import { createJobAction } from "@/app/actions/jobs";
import { usePageBulkSelection } from "@/shared/hooks/usePageBulkSelection";
import { useCompanyTimezone } from "@/shared/lib/company-timezone";
import {
  formatBulkAssignJobsResultMessage,
  formatBulkJobsResultMessage,
  resolveBulkStatusActionOptions,
} from "@/shared/lib/jobs-bulk-actions";
import { resolveSelectedItems } from "@/shared/lib/bulk-selection";
import { formatActionError } from "@/shared/lib/operational-errors";
import { sortJobsForOwnerView } from "@/shared/lib/jobs-owner-view-sort";
import { isJobOnOperationalDay } from "@/shared/lib/scheduled-today";
import {
  buildJobsPageHref,
  filterJobsByPageFilters,
  hasActiveJobsPageFilters,
  parseJobsPageSearchParams,
  type JobsViewTab,
} from "@/shared/lib/jobs-page-filters";
import type { Customer } from "@/shared/types/customer";
import type { Technician } from "@/shared/types/dispatch";
import {
  type Job,
  type JobFormData,
  type JobPriority,
  type JobStatus,
} from "@/shared/types/job";
import type { JobWorkflowActionId } from "@/shared/types/job-workflow";
import { ListCommandCenterLayout } from "@/shared/components/layout/ListCommandCenterLayout";
import { SettingsAlertBanner } from "@/shared/components/settings/SettingsAlertBanner";
import { CustomerSearchResultCard } from "./CustomerSearchResultCard";
import { JobDetailsPanel } from "./JobDetailsPanel";
import { JobSearchFilterBar } from "./JobSearchFilterBar";
import { JobsBulkActionBar } from "./JobsBulkActionBar";
import { JobsEmptyState } from "./JobsEmptyState";
import { JobsTable } from "./JobsTable";
import { JobsTodayCardList } from "./JobsTodayCardList";
import { JobsViewTabs } from "./JobsViewTabs";

type PanelMode = "create" | "empty";

type JobsPageViewProps = {
  initialJobs: Job[];
  initialTodayJobs: Job[];
  companyTimeZone: string;
  customers: Customer[];
  technicians?: Technician[];
  canDispatchJobs: boolean;
  canManageCustomers?: boolean;
  initialPanelMode?: PanelMode;
  createInitialData?: Partial<JobFormData>;
  initialViewTab?: JobsViewTab;
  initialStatusFilter?: JobStatus | "all";
  initialPriorityFilter?: JobPriority | "all";
  initialUnassignedOnly?: boolean;
};

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
  initialTodayJobs,
  companyTimeZone: companyTimeZoneProp,
  customers,
  technicians = [],
  canDispatchJobs,
  canManageCustomers = false,
  initialPanelMode = "empty",
  createInitialData,
  initialViewTab = "today",
  initialStatusFilter = "all",
  initialPriorityFilter = "all",
  initialUnassignedOnly = false,
}: JobsPageViewProps) {
  const [jobs, setJobs] = useState(initialJobs);
  const [todayJobs, setTodayJobs] = useState(initialTodayJobs);
  const [search, setSearch] = useState("");
  const [viewTab, setViewTab] = useState<JobsViewTab>(initialViewTab);
  const [statusFilter, setStatusFilter] = useState<JobStatus | "all">(
    initialStatusFilter,
  );
  const [priorityFilter, setPriorityFilter] = useState<JobPriority | "all">(
    initialPriorityFilter,
  );
  const [unassignedOnly, setUnassignedOnly] = useState(initialUnassignedOnly);
  const [panelMode, setPanelMode] = useState<PanelMode>(initialPanelMode);
  const [createError, setCreateError] = useState<string | null>(null);
  const [bulkActionMessage, setBulkActionMessage] = useState<string | null>(null);
  const [bulkActionFailureDetails, setBulkActionFailureDetails] = useState<
    string[] | null
  >(null);
  const [bulkActionTone, setBulkActionTone] = useState<
    "success" | "warning" | "error"
  >("success");
  const [isPending, startTransition] = useTransition();
  const [isBulkAssigning, startBulkAssignTransition] = useTransition();
  const [isBulkUpdatingStatus, startBulkStatusTransition] = useTransition();
  const router = useRouter();
  const searchParams = useSearchParams();
  const companyTimeZoneFromContext = useCompanyTimezone();
  const companyTimeZone = companyTimeZoneProp || companyTimeZoneFromContext;

  useEffect(() => {
    setJobs(initialJobs);
    setTodayJobs(initialTodayJobs);
  }, [initialJobs, initialTodayJobs]);

  useEffect(() => {
    const parsed = parseJobsPageSearchParams({
      status: searchParams.get("status") ?? undefined,
      view: searchParams.get("view") ?? undefined,
      unassigned: searchParams.get("unassigned") ?? undefined,
      priority: searchParams.get("priority") ?? undefined,
    });

    setViewTab(parsed.viewTab);
    setStatusFilter(parsed.statusFilter);
    setPriorityFilter(parsed.priorityFilter);
    setUnassignedOnly(parsed.unassignedOnly);
  }, [searchParams]);

  const syncFiltersToUrl = useCallback(
    (filters: {
      viewTab: JobsViewTab;
      statusFilter: JobStatus | "all";
      priorityFilter: JobPriority | "all";
      unassignedOnly: boolean;
    }) => {
      const href = buildJobsPageHref(filters, searchParams);
      router.replace(href, { scroll: false });
    },
    [router, searchParams],
  );

  const handleViewTabChange = useCallback(
    (nextTab: JobsViewTab) => {
      setViewTab(nextTab);
      syncFiltersToUrl({
        viewTab: nextTab,
        statusFilter,
        priorityFilter,
        unassignedOnly,
      });
    },
    [priorityFilter, statusFilter, syncFiltersToUrl, unassignedOnly],
  );

  const handleStatusFilterChange = useCallback(
    (value: JobStatus | "all") => {
      setStatusFilter(value);
      syncFiltersToUrl({
        viewTab,
        statusFilter: value,
        priorityFilter,
        unassignedOnly,
      });
    },
    [priorityFilter, syncFiltersToUrl, unassignedOnly, viewTab],
  );

  const handlePriorityFilterChange = useCallback(
    (value: JobPriority | "all") => {
      setPriorityFilter(value);
      syncFiltersToUrl({
        viewTab,
        statusFilter,
        priorityFilter: value,
        unassignedOnly,
      });
    },
    [statusFilter, syncFiltersToUrl, unassignedOnly, viewTab],
  );

  const handleClearFilters = useCallback(() => {
    setStatusFilter("all");
    setPriorityFilter("all");
    setUnassignedOnly(false);
    syncFiltersToUrl({
      viewTab,
      statusFilter: "all",
      priorityFilter: "all",
      unassignedOnly: false,
    });
  }, [syncFiltersToUrl, viewTab]);

  const filteredTodayJobs = useMemo(
    () =>
      sortJobsForOwnerView(
        filterJobsByPageFilters(
          todayJobs,
          statusFilter,
          priorityFilter,
          unassignedOnly,
          { matchDispatchInProgressCard: true },
        ),
      ),
    [todayJobs, statusFilter, priorityFilter, unassignedOnly],
  );

  const filteredAllJobs = useMemo(
    () =>
      sortJobsForOwnerView(
        filterJobsByPageFilters(
          jobs,
          statusFilter,
          priorityFilter,
          unassignedOnly,
        ),
      ),
    [jobs, statusFilter, priorityFilter, unassignedOnly],
  );

  const filteredCustomers = useMemo(
    () => filterCustomers(customers, search),
    [customers, search],
  );

  const visibleJobs = useMemo(
    () => (viewTab === "today" ? filteredTodayJobs : filteredAllJobs),
    [filteredAllJobs, filteredTodayJobs, viewTab],
  );

  const isSearching = search.trim().length > 0;
  const selectionEnabled = canDispatchJobs && !isSearching;
  const {
    selectedIds,
    selectedCount,
    selectionState,
    toggleSelection,
    toggleAllVisible,
    clearSelection,
    setSelectedIds,
  } = usePageBulkSelection(visibleJobs, [
    viewTab,
    statusFilter,
    priorityFilter,
    unassignedOnly,
    search,
  ]);

  const selectedJobs = useMemo(
    () => resolveSelectedItems(visibleJobs, selectedIds),
    [selectedIds, visibleJobs],
  );

  function handleSelectJob(job: Job) {
    router.push(`/jobs/${job.id}`);
  }

  function clearBulkActionFeedback() {
    setBulkActionMessage(null);
    setBulkActionFailureDetails(null);
  }

  function handleToggleJobSelection(jobId: string) {
    toggleSelection(jobId);
    clearBulkActionFeedback();
  }

  function handleToggleAllVisibleSelection(selectAll: boolean) {
    toggleAllVisible(selectAll);
    clearBulkActionFeedback();
  }

  function handleClearSelection() {
    clearSelection();
    clearBulkActionFeedback();
  }

  function applyBulkActionResult(input: {
    result: Awaited<ReturnType<typeof bulkAssignJobsAction>>;
    actionLabel: string;
    onSuccess?: (successfulJobIds: Set<string>) => void;
  }) {
    const { result, actionLabel, onSuccess } = input;

    if (result.error && result.results.length === 0) {
      setBulkActionTone("error");
      setBulkActionMessage(
        formatActionError(result.error, "We couldn't update the selected jobs."),
      );
      return;
    }

    const failedIds = new Set(
      result.results.filter((item) => !item.success).map((item) => item.jobId),
    );
    const successfulIds = new Set(
      result.results.filter((item) => item.success).map((item) => item.jobId),
    );

    setSelectedIds((previous) => {
      if (failedIds.size === 0) {
        return new Set();
      }

      const next = new Set<string>();
      for (const jobId of previous) {
        if (failedIds.has(jobId)) {
          next.add(jobId);
        }
      }
      return next;
    });

    const failureDetails = result.results
      .filter((item) => !item.success)
      .map(
        (item) => `${item.jobNumber}: ${item.error ?? "Could not be updated."}`,
      );

    setBulkActionFailureDetails(
      failureDetails.length > 0 ? failureDetails : null,
    );
    setBulkActionTone(
      result.successCount > 0
        ? result.failureCount > 0
          ? "warning"
          : "success"
        : "error",
    );
    setBulkActionMessage(
      formatBulkJobsResultMessage({
        successCount: result.successCount,
        failureCount: result.failureCount,
        actionLabel,
      }),
    );

    if (result.successCount > 0) {
      onSuccess?.(successfulIds);
      router.refresh();
    }
  }

  function handleBulkAssign(technicianId: string) {
    if (!selectionEnabled || selectedCount === 0 || isBulkAssigning) {
      return;
    }

    const technicianName =
      technicians.find((technician) => technician.id === technicianId)?.name ??
      "technician";
    const jobIds = [...selectedIds];

    clearBulkActionFeedback();

    startBulkAssignTransition(async () => {
      const result = await bulkAssignJobsAction(jobIds, technicianId);

      if (result.error && result.results.length === 0) {
        setBulkActionTone("error");
        setBulkActionMessage(
          formatActionError(result.error, "We couldn't assign the selected jobs."),
        );
        return;
      }

      const failedIds = new Set(
        result.results.filter((item) => !item.success).map((item) => item.jobId),
      );

      setSelectedIds((previous) => {
        if (failedIds.size === 0) {
          return new Set();
        }

        const next = new Set<string>();
        for (const jobId of previous) {
          if (failedIds.has(jobId)) {
            next.add(jobId);
          }
        }
        return next;
      });

      const failureDetails = result.results
        .filter((item) => !item.success)
        .map(
          (item) => `${item.jobNumber}: ${item.error ?? "Could not be assigned."}`,
        );

      setBulkActionFailureDetails(
        failureDetails.length > 0 ? failureDetails : null,
      );
      setBulkActionTone(
        result.successCount > 0
          ? result.failureCount > 0
            ? "warning"
            : "success"
          : "error",
      );
      setBulkActionMessage(
        formatBulkAssignJobsResultMessage({
          successCount: result.successCount,
          failureCount: result.failureCount,
          technicianName,
        }),
      );

      if (result.successCount > 0) {
        router.refresh();
      }
    });
  }

  function handleBulkUpdateStatus(actionId: JobWorkflowActionId) {
    if (!selectionEnabled || selectedCount === 0 || isBulkUpdatingStatus) {
      return;
    }

    const actionLabel =
      resolveBulkStatusActionOptions(selectedJobs).find(
        (option) => option.id === actionId,
      )?.label ?? "Status update";
    const jobIds = [...selectedIds];

    clearBulkActionFeedback();

    startBulkStatusTransition(async () => {
      const result = await bulkUpdateJobStatusAction(jobIds, actionId);

      applyBulkActionResult({
        result,
        actionLabel,
      });
    });
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
    if (isPending) {
      return;
    }

    setCreateError(null);

    startTransition(async () => {
      const result = await createJobAction(data);

      if (result.error || !result.job) {
        setCreateError(
          formatActionError(
            result.error,
            "We couldn't create this job. Check the customer and schedule, then try again.",
          ),
        );
        return;
      }

      setJobs((previous) => [result.job!, ...previous]);
      if (
        isJobOnOperationalDay(result.job!, {
          reference: new Date(),
          timeZone: companyTimeZone,
        })
      ) {
        setTodayJobs((previous) =>
          sortJobsForOwnerView([result.job!, ...previous]),
        );
      }
      setPanelMode("empty");
      router.push(`/jobs/${result.job.id}`);
    });
  }

  const hasNoJobs = jobs.length === 0;
  const showCustomerSearch = isSearching && customers.length > 0;
  const showCustomerSearchUnavailable = isSearching && customers.length === 0;
  const isCreateOpen = panelMode === "create";

  const hasActiveFilters = hasActiveJobsPageFilters({
    viewTab,
    statusFilter,
    priorityFilter,
    unassignedOnly,
  });

  const subtitle = isSearching
    ? "Customer search"
    : viewTab === "today"
      ? hasActiveFilters
        ? `${filteredTodayJobs.length} of ${todayJobs.length} today`
        : `${todayJobs.length} scheduled today`
      : `${jobs.length} total jobs`;

  const showJobList = !isSearching && !hasNoJobs;
  const bulkSelectAllControl =
    selectionEnabled && selectionState.selectableCount > 0 && showJobList
      ? {
          selectableCount: selectionState.selectableCount,
          allSelected: selectionState.allSelected,
          onSelectAll: () => handleToggleAllVisibleSelection(true),
          onClearSelection: handleClearSelection,
          className:
            viewTab === "today" ? undefined : "md:hidden",
        }
      : undefined;

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
      return (
        <JobsEmptyState
          variant="no-company-customers"
          canAddCustomer={canManageCustomers}
        />
      );
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

      if (filteredTodayJobs.length === 0) {
        return <JobsEmptyState variant="no-results" />;
      }

      return (
        <>
          <JobsTodayCardList
            jobs={filteredTodayJobs}
            onSelect={handleSelectJob}
            selectionEnabled={selectionEnabled}
            selectedIds={selectedIds}
            onToggleSelection={handleToggleJobSelection}
          />
          {selectionEnabled ? (
            <JobsBulkActionBar
              selectedJobs={selectedJobs}
              technicians={technicians}
              isAssigning={isBulkAssigning}
              isUpdatingStatus={isBulkUpdatingStatus}
              onAssign={handleBulkAssign}
              onUpdateStatus={handleBulkUpdateStatus}
              onClearSelection={handleClearSelection}
            />
          ) : null}
        </>
      );
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

    return (
      <>
        <JobsTable
          jobs={filteredAllJobs}
          onSelect={handleSelectJob}
          selectionEnabled={selectionEnabled}
          selectedIds={selectedIds}
          onToggleSelection={handleToggleJobSelection}
          onToggleAllVisible={handleToggleAllVisibleSelection}
        />
        {selectionEnabled ? (
          <JobsBulkActionBar
            selectedJobs={selectedJobs}
            technicians={technicians}
            isAssigning={isBulkAssigning}
            isUpdatingStatus={isBulkUpdatingStatus}
            onAssign={handleBulkAssign}
            onUpdateStatus={handleBulkUpdateStatus}
            onClearSelection={handleClearSelection}
          />
        ) : null}
      </>
    );
  }

  return (
    <ListCommandCenterLayout
      title="Jobs"
      subtitle={subtitle}
      density="compact"
      primaryAction={
        canDispatchJobs ? (
          <button
            type="button"
            onClick={handleNewJob}
            disabled={customers.length === 0}
            className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-xl admin-btn-primary px-3 py-1.5 text-sm disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Plus className="h-3.5 w-3.5" />
            New Job
          </button>
        ) : undefined
      }
      className={
        isCreateOpen
          ? "max-lg:h-[calc(100dvh-7rem)] max-lg:min-h-0 max-lg:overflow-hidden"
          : undefined
      }
    >
      <section
        className={`flex min-h-[16rem] min-w-0 lg:flex-1 flex-col overflow-hidden admin-card lg:min-h-0 ${
          isCreateOpen ? "max-lg:hidden" : ""
        }`}
      >
        {!isSearching && !hasNoJobs ? (
          <div className="shrink-0 border-b border-slate-100/90 px-3 py-1.5 sm:px-4">
            <JobsViewTabs
              activeTab={viewTab}
              onTabChange={handleViewTabChange}
              todayCount={todayJobs.length}
              allCount={jobs.length}
            />
          </div>
        ) : null}

        {bulkActionMessage ? (
          <div className="shrink-0 border-b border-slate-100/90 px-3 py-3 sm:px-4">
            <SettingsAlertBanner tone={bulkActionTone}>
              <div>
                <p>{bulkActionMessage}</p>
                {bulkActionFailureDetails?.length ? (
                  <ul className="mt-2 list-disc space-y-1 pl-4 text-xs">
                    {bulkActionFailureDetails.map((detail) => (
                      <li key={detail}>{detail}</li>
                    ))}
                  </ul>
                ) : null}
              </div>
            </SettingsAlertBanner>
          </div>
        ) : null}

        <JobSearchFilterBar
          search={search}
          onSearchChange={setSearch}
          resultCount={
            isSearching
              ? filteredCustomers.length
              : viewTab === "today"
                ? filteredTodayJobs.length
                : filteredAllJobs.length
          }
          resultLabel={isSearching ? "customers" : "jobs"}
          statusFilter={statusFilter}
          priorityFilter={priorityFilter}
          onStatusFilterChange={handleStatusFilterChange}
          onPriorityFilterChange={handlePriorityFilterChange}
          showJobFilters={!isSearching && !hasNoJobs}
          unassignedOnly={unassignedOnly}
          hasActiveFilters={hasActiveFilters}
          onClearFilters={handleClearFilters}
          bulkSelectAllControl={bulkSelectAllControl}
        />

        <div className="min-h-0 min-w-0 flex-1 overflow-x-hidden lg:overflow-y-auto">
          {renderMainContent()}
        </div>
      </section>

      <JobDetailsPanel
        mode={panelMode}
        customers={customers}
        onClose={handleClosePanel}
        onCreateSubmit={handleCreateSubmit}
        onCreateCancel={handleClosePanel}
        createError={createError}
        isSubmitting={isPending}
        createInitialData={createInitialData}
      />
    </ListCommandCenterLayout>
  );
}
