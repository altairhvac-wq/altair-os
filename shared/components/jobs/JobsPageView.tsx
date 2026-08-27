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
import { searchCustomerOptionsAction } from "@/app/actions/list-pages";
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
import type { PagedListSnapshot } from "@/shared/components/lists/usePagedList";
import { loadJobsPageAction, searchJobsAction } from "@/app/actions/list-pages";
import { PagedListFooter } from "@/shared/components/lists/PagedListFooter";
import { usePagedList } from "@/shared/components/lists/usePagedList";

/** Mirrors SEARCH_CANDIDATE_LIMIT in lib/database/queries/list-pages.ts. */
const SEARCH_RESULT_CAP = 500;
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
  /**
   * One server-paged page of the "all jobs" tab.
   *
   * When present the list is authoritative from the server: rows are already
   * scoped by lifecycle, status, priority and assignment, so the client-side
   * equivalents are skipped rather than run a second time. Ranking still happens
   * here — see serverSearchCandidates.
   */
  serverPage?: PagedListSnapshot<Job>;
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

/** Stable empty array: a fresh [] would invalidate the customersById memo on
 *  every render while the search box is empty, which is most of the time. */
const EMPTY_CUSTOMERS: Customer[] = [];

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
  serverPage,
}: JobsPageViewProps) {
  const isServerPaged = Boolean(serverPage);

  const snapshot = useMemo<PagedListSnapshot<Job>>(
    () =>
      serverPage ?? {
        rows: initialJobs,
        nextCursor: null,
        totalCount: initialJobs.length,
        hasMore: false,
      },
    [serverPage, initialJobs],
  );

  /**
   * Candidates for a ranked search, fetched from the whole tenant.
   *
   * Search and browse are genuinely different modes here. Browsing is paged;
   * searching is ranked, and ranking needs its candidates up front rather than
   * a page at a time. Keeping them separate is what lets the existing
   * rankAndSortRecords keep working untouched over rows that now come from the
   * whole book instead of the most recent thousand.
   */
  const [searchCandidates, setSearchCandidates] = useState<Job[] | null>(null);
  const [searchTruncated, setSearchTruncated] = useState(false);
  const [isFetchingCandidates, startSearchTransition] = useTransition();

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

  /**
   * Browse-mode paging for the All Jobs tab.
   *
   * "Load more" must continue the SAME list the server rendered page one from,
   * so it repeats the active filters. Sending different ones would silently
   * splice a second list onto the bottom of the first.
   */
  const paged = usePagedList<Job>(
    snapshot,
    useCallback(
      (cursor) =>
        loadJobsPageAction({
          cursor,
          statusFilter,
          priorityFilter,
          unassignedOnly,
        }),
      [priorityFilter, statusFilter, unassignedOnly],
    ),
  );
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

  // Adjust during render rather than in an effect. Setting state inside an
  // effect makes React render once with the stale list and again with the new
  // one, which lint flags as a cascading render — and on this page the stale
  // frame is a list of the wrong jobs.
  const [seenJobsSource, setSeenJobsSource] = useState<Job[] | null>(null);
  const incomingJobs = isServerPaged ? paged.rows : initialJobs;
  if (seenJobsSource !== incomingJobs) {
    setSeenJobsSource(incomingJobs);
    setJobs(incomingJobs);
  }

  const [seenTodayJobs, setSeenTodayJobs] = useState<Job[] | null>(null);
  if (seenTodayJobs !== initialTodayJobs) {
    setSeenTodayJobs(initialTodayJobs);
    setTodayJobs(initialTodayJobs);
  }

  /**
   * Fetch ranked-search candidates when the term settles.
   *
   * Debounced through useDeferredValue, which the search box already used, so
   * the request rate is unchanged from the client-side version. What changed is
   * where the rows come from: the whole tenant rather than the page in memory.
   */
  useEffect(() => {
    if (!isServerPaged) return;

    // An empty term is not a state to store — it is the absence of a search, and
    // allJobsSource derives that from the term directly. Clearing state here
    // instead would set state synchronously in an effect for the most common
    // keystroke of all: the last backspace.
    const term = deferredSearch.trim();
    if (!term) return;

    let cancelled = false;
    startSearchTransition(async () => {
      const result = await searchJobsAction({
        search: term,
        statusFilter,
        priorityFilter,
        unassignedOnly,
      });
      if (cancelled) return;
      setSearchCandidates(result.jobs ?? []);
      setSearchTruncated(Boolean(result.truncated));
    });

    return () => {
      cancelled = true;
    };
  }, [
    deferredSearch,
    isServerPaged,
    priorityFilter,
    statusFilter,
    unassignedOnly,
  ]);

  /**
   * While a search is active the list ranks over the server's candidates; with
   * no term it browses the current page. Two modes, one list.
   */
  const hasSearchTerm = deferredSearch.trim().length > 0;
  const allJobsSource = useMemo(
    () =>
      isServerPaged && hasSearchTerm && searchCandidates !== null
        ? searchCandidates
        : jobs,
    [hasSearchTerm, isServerPaged, jobs, searchCandidates],
  );

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
    () =>
      allJobsSource.filter((job) => getJobLifecycleState(job) === lifecycleFilter),
    [allJobsSource, lifecycleFilter],
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

  // ============================== CUSTOMERS ARE NOT LOADED IN BULK ANY MORE ==============================
  // This page used to receive every customer in the company so it could filter
  // them here. That was 1.27 MB of rows on the seeded tenant and a 3.56 MB
  // page, and it was also WRONG at scale: the array stopped at PostgREST's
  // 1,000 rows, so the picker could not offer a customer who existed and the
  // search section could not find them.
  //
  // `customers` is now a bounded slice for the picker's default list, and
  // searching goes to the server, which searches the whole tenant.
  // The response carries the term it answers, and the term on screen is what
  // decides whether to show it. That does two things a plain results array
  // does not: clearing the box needs no state write at all, and a response for
  // a term the user has already typed past is ignored rather than rendered
  // under the new one.
  const [customerSearch, setCustomerSearch] = useState<{
    term: string;
    customers: Customer[];
    truncated: boolean;
  }>({ term: "", customers: [], truncated: false });

  useEffect(() => {
    const query = deferredSearch.trim();
    if (!query) return;

    let cancelled = false;
    void searchCustomerOptionsAction(query).then((response) => {
      if (cancelled) return;
      setCustomerSearch({
        term: query,
        customers: response.result?.customers ?? [],
        truncated: response.result?.truncated ?? false,
      });
    });

    return () => {
      cancelled = true;
    };
  }, [deferredSearch]);

  const customerSearchIsCurrent =
    deferredSearch.trim() !== "" && customerSearch.term === deferredSearch.trim();
  const searchedCustomers = customerSearchIsCurrent
    ? customerSearch.customers
    : EMPTY_CUSTOMERS;
  const customerSearchTruncated =
    customerSearchIsCurrent && customerSearch.truncated;

  // Search ranking wants the customer behind each job, for the company name,
  // email and phone that the job row does not carry. Built from whichever
  // customers are actually in hand — the bounded slice plus anything the
  // search returned — rather than from a copy of the book.
  const customersById = useMemo(
    () =>
      new Map(
        [...customers, ...searchedCustomers].map((customer) => [
          customer.id,
          customer,
        ]),
      ),
    [customers, searchedCustomers],
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
    // Server-paged: the rows already have lifecycle, status, priority and
    // assignment applied in SQL, so re-running those predicates here would be a
    // second, weaker copy of the same rule over a subset of the data. Ranking
    // still runs, over candidates the server drew from the whole tenant.
    const filtered = isServerPaged
      ? lifecycleFilteredJobs
      : filterJobsByPageFilters(
          lifecycleFilteredJobs,
          statusFilter,
          priorityFilter,
          unassignedOnly,
        );
    return applyJobSearch(filtered);
  }, [
    isServerPaged,
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

  const filteredCustomers = searchedCustomers;

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
  const showCustomerMatches = isSearching && filteredCustomers.length > 0;

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
          {customerSearchTruncated ? (
            <span className="ml-2 font-normal normal-case tracking-normal text-altair-ink-on-paper-secondary">
              showing the first {filteredCustomers.length} matches
            </span>
          ) : null}
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
        {isServerPaged && hasSearchTerm && isFetchingCandidates ? (
          <p className="px-4 py-2 text-xs text-altair-ink-on-paper-secondary" aria-live="polite">
            Searching all jobs…
          </p>
        ) : null}
        {isServerPaged && hasSearchTerm && searchTruncated ? (
          /*
            Said plainly rather than left implicit. The whole defect this page is
            recovering from was a list that looked complete and was not, so a
            capped result set has to announce itself.
          */
          <p className="px-4 py-2 text-xs text-altair-ink-on-paper-secondary" role="status">
            Showing the first {SEARCH_RESULT_CAP.toLocaleString()} matches. Narrow
            the search to see the rest.
          </p>
        ) : null}
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
        {/*
          Browse mode only. A ranked search is not a page — it is the whole
          matching set, ordered by relevance, and offering "load more" under it
          would imply a next page that does not exist.
        */}
        {isServerPaged && !hasSearchTerm ? (
          <PagedListFooter
            loadedCount={paged.loadedCount}
            totalCount={paged.totalCount}
            hasMore={paged.hasMore}
            isLoadingMore={paged.isLoadingMore}
            error={paged.error}
            onLoadMore={paged.loadMore}
            noun="jobs"
          />
        ) : null}
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
      data-testid="page-work"
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
