"use client";

import {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
  useTransition,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus, Truck } from "lucide-react";
import {
  bulkArchiveJobsAction,
  bulkCancelJobsAction,
  bulkMoveJobsToTrashAction,
  bulkPermanentlyDeleteJobsAction,
  bulkRestoreJobsAction,
  bulkRestoreJobsFromTrashAction,
} from "@/app/actions/jobs-bulk-lifecycle";
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
import {
  formatBulkLifecycleFailureDetails,
  getBulkLifecycleFailedIds,
  pruneBulkSelectionToFailedIds,
  type BulkLifecycleActionResult,
} from "@/shared/lib/bulk-lifecycle-runner";
import {
  formatBulkJobsResultMessage as formatBulkJobLifecycleResultMessage,
  getJobLifecycleState,
} from "@/shared/lib/job-lifecycle";
import { countOperationalActive } from "@/shared/lib/operational-lifecycle";
import { EntityLifecycleBulkBar } from "@/shared/components/lifecycle/EntityLifecycleBulkBar";
import { formatActionError } from "@/shared/lib/operational-errors";
import { sortJobsForOwnerView } from "@/shared/lib/jobs-owner-view-sort";
import { sortJobsByScheduledTime } from "@/shared/lib/jobs-today-schedule";
import { isJobOnOperationalDay } from "@/shared/lib/scheduled-today";
import { buildJobsGlanceStats } from "@/shared/lib/jobs/jobs-glance-stats";
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
  type JobLifecycleState,
  type JobPriority,
  type JobStatus,
} from "@/shared/types/job";
import type { JobWorkflowActionId } from "@/shared/types/job-workflow";
import {
  MasterListPageLayout,
  MasterPageSurface,
  masterListPageScrollRegionClass,
  masterListPageSurfaceClass,
} from "@/shared/design-system/shell";
import { Button } from "@/shared/design-system/components";
import { SettingsAlertBanner } from "@/shared/components/settings/SettingsAlertBanner";
import { CustomerSearchResultCard } from "./CustomerSearchResultCard";
import { JobDetailsPanel } from "./JobDetailsPanel";
import { JobSearchFilterBar } from "./JobSearchFilterBar";
import { JobsBulkActionBar } from "./JobsBulkActionBar";
import { JobsEmptyState } from "./JobsEmptyState";
import { JobsStatStrip } from "./JobsStatStrip";
import { JobsTable } from "./JobsTable";
import { JobsTodayCardList } from "./JobsTodayCardList";
import { jobMissionClasses as jm } from "./job-list-presentation";
import {
  buildJobSearchFields,
  rankAndSortRecords,
} from "@/shared/lib/search";
import type { JobBillingSummariesByJobId } from "@/shared/lib/job-next-business-action";

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
  billingSummaries?: JobBillingSummariesByJobId;
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
  billingSummaries,
}: JobsPageViewProps) {
  const [jobs, setJobs] = useState(initialJobs);
  const [todayJobs, setTodayJobs] = useState(initialTodayJobs);
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [viewTab, setViewTab] = useState<JobsViewTab>(initialViewTab);
  const [statusFilter, setStatusFilter] = useState<JobStatus | "all">(
    initialStatusFilter,
  );
  const [priorityFilter, setPriorityFilter] = useState<JobPriority | "all">(
    initialPriorityFilter,
  );
  const [unassignedOnly, setUnassignedOnly] = useState(initialUnassignedOnly);
  const [lifecycleFilter, setLifecycleFilter] =
    useState<JobLifecycleState>("active");
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
  const [isBulkArchiving, startBulkArchiveTransition] = useTransition();
  const [isBulkRestoring, startBulkRestoreTransition] = useTransition();
  const [isBulkCancelling, startBulkCancelTransition] = useTransition();
  const [isBulkMovingToTrash, startBulkMoveToTrashTransition] = useTransition();
  const [isBulkRestoringFromTrash, startBulkRestoreFromTrashTransition] =
    useTransition();
  const [isBulkPermanentlyDeleting, startBulkPermanentDeleteTransition] =
    useTransition();
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

  const handleUnassignedOnlyChange = useCallback(
    (value: boolean) => {
      setUnassignedOnly(value);
      syncFiltersToUrl({
        viewTab,
        statusFilter,
        priorityFilter,
        unassignedOnly: value,
      });
    },
    [priorityFilter, statusFilter, syncFiltersToUrl, viewTab],
  );

  const lifecycleFilteredJobs = useMemo(
    () => jobs.filter((job) => getJobLifecycleState(job) === lifecycleFilter),
    [jobs, lifecycleFilter],
  );

  const activeTodayCount = useMemo(
    () => countOperationalActive(todayJobs, getJobLifecycleState),
    [todayJobs],
  );

  const activeAllCount = useMemo(
    () => countOperationalActive(jobs, getJobLifecycleState),
    [jobs],
  );

  const lifecycleFilteredTodayJobs = useMemo(
    () =>
      todayJobs.filter((job) => getJobLifecycleState(job) === lifecycleFilter),
    [todayJobs, lifecycleFilter],
  );

  const viewScopedJobsForGlance = useMemo(
    () =>
      viewTab === "today" ? lifecycleFilteredTodayJobs : lifecycleFilteredJobs,
    [lifecycleFilteredJobs, lifecycleFilteredTodayJobs, viewTab],
  );

  const glanceStats = useMemo(
    () => buildJobsGlanceStats({ jobs: viewScopedJobsForGlance }),
    [viewScopedJobsForGlance],
  );

  const customersById = useMemo(
    () => new Map(customers.map((customer) => [customer.id, customer])),
    [customers],
  );

  const applyJobSearch = useCallback(
    (sourceJobs: Job[]) => {
      const query = deferredSearch.trim();
      if (!query) {
        return {
          items: sortJobsForOwnerView(sourceJobs),
          matchReasons: {} as Record<string, string>,
        };
      }

      const ranked = rankAndSortRecords(sourceJobs, query, (job) =>
        buildJobSearchFields(job, customersById.get(job.customerId), {
          estimateNumbers: (
            billingSummaries?.estimatesByJobId[job.id] ?? []
          ).map((estimate) => estimate.estimateNumber),
          invoiceNumbers: (
            billingSummaries?.invoicesByJobId[job.id] ?? []
          ).map((invoice) => invoice.invoiceNumber),
        }),
      );

      const matchReasons: Record<string, string> = {};
      for (const entry of ranked) {
        if (entry.match.reason) {
          matchReasons[entry.record.id] = entry.match.reason;
        }
      }

      return {
        items: ranked.map((entry) => entry.record),
        matchReasons,
      };
    },
    [billingSummaries, customersById, deferredSearch],
  );

  const filteredTodayResult = useMemo(() => {
    const filtered = filterJobsByPageFilters(
      lifecycleFilteredTodayJobs,
      statusFilter,
      priorityFilter,
      unassignedOnly,
    );
    const result = applyJobSearch(filtered);
    // Day-at-a-glance is chronological; All Jobs keeps owner-view sort.
    if (!deferredSearch.trim()) {
      return {
        ...result,
        items: sortJobsByScheduledTime(result.items),
      };
    }
    return result;
  }, [
    applyJobSearch,
    deferredSearch,
    lifecycleFilteredTodayJobs,
    statusFilter,
    priorityFilter,
    unassignedOnly,
  ]);

  const filteredAllResult = useMemo(() => {
    const filtered = filterJobsByPageFilters(
      lifecycleFilteredJobs,
      statusFilter,
      priorityFilter,
      unassignedOnly,
    );
    return applyJobSearch(filtered);
  }, [
    applyJobSearch,
    lifecycleFilteredJobs,
    statusFilter,
    priorityFilter,
    unassignedOnly,
  ]);

  const filteredTodayJobs = filteredTodayResult.items;
  const filteredAllJobs = filteredAllResult.items;
  const searchMatchReasons =
    viewTab === "today"
      ? filteredTodayResult.matchReasons
      : filteredAllResult.matchReasons;

  const filteredCustomers = useMemo(
    () => filterCustomers(customers, deferredSearch),
    [customers, deferredSearch],
  );

  const visibleJobs = useMemo(
    () => (viewTab === "today" ? filteredTodayJobs : filteredAllJobs),
    [filteredAllJobs, filteredTodayJobs, viewTab],
  );

  const isSearching = deferredSearch.trim().length > 0;
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
    lifecycleFilter,
    search,
  ]);

  const selectedJobs = useMemo(
    () => resolveSelectedItems(visibleJobs, selectedIds),
    [selectedIds, visibleJobs],
  );

  function handleSelectJob(job: Job) {
    router.push(`/work/${job.id}`);
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

  function applyBulkLifecycleResult(input: {
    result: BulkLifecycleActionResult;
    actionLabel: string;
  }) {
    const { result, actionLabel } = input;

    if (result.error && result.results.length === 0) {
      setBulkActionTone("error");
      setBulkActionMessage(
        formatActionError(result.error, "We couldn't update the selected jobs."),
      );
      return;
    }

    setSelectedIds((previous) =>
      pruneBulkSelectionToFailedIds(previous, getBulkLifecycleFailedIds(result)),
    );

    setBulkActionFailureDetails(
      formatBulkLifecycleFailureDetails(result).length > 0
        ? formatBulkLifecycleFailureDetails(result)
        : null,
    );
    setBulkActionTone(
      result.successCount > 0
        ? result.failureCount > 0
          ? "warning"
          : "success"
        : "error",
    );
    setBulkActionMessage(
      formatBulkJobLifecycleResultMessage({
        successCount: result.successCount,
        failureCount: result.failureCount,
        actionLabel,
      }),
    );

    if (result.successCount > 0) {
      router.refresh();
    }
  }

  function runBulkLifecycle(
    action: (ids: string[]) => Promise<BulkLifecycleActionResult>,
    actionLabel: string,
    startTransitionFn: (callback: () => void) => void,
  ) {
    if (!selectionEnabled || selectedCount === 0) return;
    const ids = [...selectedIds];
    clearBulkActionFeedback();
    startTransitionFn(async () => {
      const result = await action(ids);
      applyBulkLifecycleResult({ result, actionLabel });
    });
  }

  function handleBulkArchive() {
    runBulkLifecycle(bulkArchiveJobsAction, "Archive", startBulkArchiveTransition);
  }

  function handleBulkRestore() {
    runBulkLifecycle(bulkRestoreJobsAction, "Restore", startBulkRestoreTransition);
  }

  function handleBulkCancel() {
    runBulkLifecycle(bulkCancelJobsAction, "Cancel", startBulkCancelTransition);
  }

  function handleBulkMoveToTrash() {
    runBulkLifecycle(
      bulkMoveJobsToTrashAction,
      "Move to Recently Deleted",
      startBulkMoveToTrashTransition,
    );
  }

  function handleBulkRestoreFromTrash() {
    runBulkLifecycle(
      bulkRestoreJobsFromTrashAction,
      "Restore from Recently Deleted",
      startBulkRestoreFromTrashTransition,
    );
  }

  function handleBulkPermanentDelete() {
    runBulkLifecycle(
      bulkPermanentlyDeleteJobsAction,
      "Permanent delete",
      startBulkPermanentDeleteTransition,
    );
  }

  const lifecycleBulkBar =
    selectionEnabled && selectedCount > 0 ? (
      <EntityLifecycleBulkBar
        entityLabel="job"
        selectedCount={selectedCount}
        lifecycleFilter={lifecycleFilter}
        isArchiving={isBulkArchiving}
        isRestoring={isBulkRestoring}
        isCancelling={isBulkCancelling}
        isMovingToTrash={isBulkMovingToTrash}
        isRestoringFromTrash={isBulkRestoringFromTrash}
        isPermanentlyDeleting={isBulkPermanentlyDeleting}
        showArchive={lifecycleFilter === "active"}
        showCancel={lifecycleFilter === "active"}
        showMoveToTrash={lifecycleFilter === "active" || lifecycleFilter === "archived"}
        showRestore={lifecycleFilter === "archived"}
        showRestoreFromTrash={lifecycleFilter === "deleted"}
        showPermanentDelete={lifecycleFilter === "deleted"}
        onArchive={handleBulkArchive}
        onRestore={handleBulkRestore}
        onCancel={handleBulkCancel}
        onMoveToTrash={handleBulkMoveToTrash}
        onRestoreFromTrash={handleBulkRestoreFromTrash}
        onPermanentDelete={handleBulkPermanentDelete}
        onClearSelection={handleClearSelection}
      />
    ) : null;

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
      router.push(`/work/${result.job.id}`);
    });
  }

  const hasNoJobs = jobs.length === 0;
  const showCustomerMatches =
    isSearching && customers.length > 0 && filteredCustomers.length > 0;

  const hasActiveFilters = hasActiveJobsPageFilters({
    viewTab,
    statusFilter,
    priorityFilter,
    unassignedOnly,
  });

  const showJobList = !hasNoJobs;
  const bulkSelectAllControl =
    selectionEnabled && selectionState.selectableCount > 0 && showJobList
      ? {
          selectableCount: selectionState.selectableCount,
          allSelected: selectionState.allSelected,
          onSelectAll: () => handleToggleAllVisibleSelection(true),
          onClearSelection: handleClearSelection,
          className: viewTab === "today" ? undefined : "md:hidden",
        }
      : undefined;

  function renderCustomerMatches() {
    if (!showCustomerMatches) return null;

    return (
      <section
        className="mt-4 border-t border-altair-border/60 pt-4"
        aria-label="Matching customers"
      >
        <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-[0.08em] text-altair-ink-on-paper-muted">
          Customers
        </p>
        <ul className="divide-y divide-altair-border/50">
          {filteredCustomers.map((customer) => (
            <li key={customer.id}>
              <CustomerSearchResultCard customer={customer} />
            </li>
          ))}
        </ul>
      </section>
    );
  }

  function renderMainContent() {
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
        return (
          <>
            <JobsEmptyState variant="no-results" />
            {renderCustomerMatches()}
          </>
        );
      }

      return (
        <>
          <JobsTodayCardList
            jobs={filteredTodayJobs}
            onSelect={handleSelectJob}
            selectionEnabled={selectionEnabled}
            selectedIds={selectedIds}
            onToggleSelection={handleToggleJobSelection}
            matchReasons={searchMatchReasons}
            timeZone={companyTimeZone}
          />
          {selectionEnabled && lifecycleFilter === "active" ? (
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
          {lifecycleBulkBar}
          {renderCustomerMatches()}
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
      return (
        <>
          <JobsEmptyState variant="no-results" />
          {renderCustomerMatches()}
        </>
      );
    }

    return (
      <>
        <JobsTable
          jobs={filteredAllJobs}
          onSelect={handleSelectJob}
          canManageCustomers={canManageCustomers}
          selectionEnabled={selectionEnabled}
          selectedIds={selectedIds}
          onToggleSelection={handleToggleJobSelection}
          onToggleAllVisible={handleToggleAllVisibleSelection}
          billingSummaries={billingSummaries}
          matchReasons={searchMatchReasons}
          companyTimeZone={companyTimeZone}
        />
        {selectionEnabled && lifecycleFilter === "active" ? (
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
        {lifecycleBulkBar}
        {renderCustomerMatches()}
      </>
    );
  }

  return (
    <MasterListPageLayout
      title="Work"
      subtitle="See what is happening, what needs attention, and what comes next."
      density="compact"
      headerSurfaceVariant="default"
      headerTitleClassName="min-w-0 text-base font-semibold tracking-tight text-altair-ink-on-paper sm:text-lg"
      headerSubtitleClassName="min-w-0 truncate text-[11px] leading-snug text-altair-ink-on-paper-muted"
      headerClassName="py-1.5"
      headerCenter={
        hasNoJobs || isSearching ? undefined : (
          <JobsStatStrip
            stats={glanceStats}
            activeStatus={statusFilter}
            onFilterStatus={handleStatusFilterChange}
            viewTab={viewTab}
            onViewTabChange={handleViewTabChange}
            todayCount={activeTodayCount}
            allCount={activeAllCount}
          />
        )
      }
      secondaryAction={
        <Button
          href="/dispatch"
          size="sm"
          variant="secondary"
          leadingIcon={<Truck className="h-3.5 w-3.5" />}
        >
          <span className="hidden sm:inline">Open Dispatch board</span>
          <span className="sm:hidden">Dispatch</span>
        </Button>
      }
      primaryAction={
        canDispatchJobs ? (
          <Button
            size="sm"
            onClick={handleNewJob}
            disabled={customers.length === 0}
            leadingIcon={<Plus className="h-3.5 w-3.5" />}
          >
            New Job
          </Button>
        ) : undefined
      }
      banners={
        bulkActionMessage ? (
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
        ) : undefined
      }
    >
      <MasterPageSurface
        variant="workspace"
        className={masterListPageSurfaceClass}
      >
        {!hasNoJobs ? (
          <div className={jm.filterRegion}>
            <div className={jm.filterSearchBand}>
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
                lifecycleFilter={lifecycleFilter}
                onLifecycleFilterChange={setLifecycleFilter}
                showLifecycleFilter={!isSearching && canDispatchJobs}
                showJobFilters={!isSearching}
                showMobileStatusFilter={!isSearching}
                unassignedOnly={unassignedOnly}
                onUnassignedOnlyChange={handleUnassignedOnlyChange}
                hasActiveFilters={hasActiveFilters}
                onClearFilters={handleClearFilters}
                mobileViewControls={
                  isSearching
                    ? undefined
                    : {
                        viewTab,
                        onViewTabChange: handleViewTabChange,
                        todayCount: activeTodayCount,
                        allCount: activeAllCount,
                      }
                }
                bulkSelectAllControl={bulkSelectAllControl}
              />
            </div>
          </div>
        ) : null}

        <div className={masterListPageScrollRegionClass}>
          {renderMainContent()}
        </div>
      </MasterPageSurface>

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
    </MasterListPageLayout>
  );
}
