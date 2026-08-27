"use client";

import { loadEstimatesPageAction } from "@/app/actions/list-pages";
import { PagedListFooter } from "@/shared/components/lists/PagedListFooter";
import {
  usePagedList,
  useUrlParamState,
  type PagedListSnapshot,
} from "@/shared/components/lists/usePagedList";
import {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
  useTransition,
} from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import {
  batchSendEstimatesAction,
  createEstimateAction,
} from "@/app/actions/estimates";
import { isNorthStarShellEnabled } from "@/lib/beta/north-star-shell";
import {
  bulkArchiveEstimatesAction,
  bulkMoveEstimatesToTrashAction,
  bulkPermanentlyDeleteEstimatesAction,
  bulkRestoreEstimatesAction,
  bulkRestoreEstimatesFromTrashAction,
  bulkVoidEstimatesAction,
} from "@/app/actions/estimates-bulk-lifecycle";
import { resolveSelectedItems } from "@/shared/lib/bulk-selection";
import {
  buildJobsByIdForEstimateBatchSend,
  formatBatchSendEstimatesResultMessage,
  getBatchSendableEstimates,
} from "@/shared/lib/estimate-batch-send";
import { usePageBulkSelection } from "@/shared/hooks/usePageBulkSelection";
import {
  formatBulkLifecycleFailureDetails,
  getBulkLifecycleFailedIds,
  pruneBulkSelectionToFailedIds,
  type BulkLifecycleActionResult,
} from "@/shared/lib/bulk-lifecycle-runner";
import {
  formatBulkEstimatesResultMessage,
  formatEstimateBulkActionConfirmMessage,
  formatEstimateBulkEligibilityHints,
  getEstimateLifecycleState,
  summarizeEstimateBulkEligibility,
} from "@/shared/lib/estimate-lifecycle";
import { formatActionError } from "@/shared/lib/operational-errors";
import { EntityLifecycleBulkBar } from "@/shared/components/lifecycle/EntityLifecycleBulkBar";
import type { Customer } from "@/shared/types/customer";
import type { Job } from "@/shared/types/job";
import type { ServiceItem } from "@/shared/types/service-item";
import {
  type Estimate,
  type EstimateFormData,
  type EstimateLifecycleState,
  type EstimateStatus,
} from "@/shared/types/estimate";
import {
  MasterListPageLayout,
  MasterPageSurface,
  masterListPagePrimaryActionClass,
  masterListPageScrollRegionClass,
  masterListPageSurfaceClass,
} from "@/shared/design-system/shell";
import { northStarListTokens as lt } from "@/shared/design-system/north-star/tokens";
import { SettingsAlertBanner } from "@/shared/components/settings/SettingsAlertBanner";
import {
  buildEstimatesGlanceStats,
  buildEstimatesGlanceStatsFromMetrics,
} from "@/shared/lib/estimates/estimates-glance-stats";
import { EstimateBatchSelectionBar } from "./EstimateBatchSelectionBar";
import { EstimateDetailsPanel } from "./EstimateDetailsPanel";
import { EstimateSearchFilterBar } from "./EstimateSearchFilterBar";
import { EstimatesEmptyState } from "./EstimatesEmptyState";
import { EstimatesStatStrip } from "./EstimatesStatStrip";
import { EstimatesTable } from "./EstimatesTable";
import {
  filterEstimatesForWorkQueue,
  resolveDefaultEstimateWorkQueue,
  sortEstimatesForWorkQueue,
  type EstimateWorkQueue,
} from "./estimate-work-queues";
import {
  buildEstimateSearchFields,
  rankAndSortRecords,
} from "@/shared/lib/search";
import type { InvoiceDocumentRef } from "@/shared/lib/documents/document-refs";

type PanelMode = "create" | "empty";

type EstimatesPageViewProps = {
  initialEstimates: Estimate[];
  /**
   * One server-paged page.
   *
   * When present the rows already have the queue and its lifecycle applied in
   * SQL, so the client-side equivalents are skipped rather than re-run over a
   * subset. The queue owns the lifecycle here — a voided invoice is Past, not
   * archived — which is why the two entities cannot share one filter builder.
   */
  serverPage?: PagedListSnapshot<Estimate>;
  /** Per-queue counts and money over the whole tenant (migration 161). */
  serverQueueMetrics?: Record<
    EstimateWorkQueue,
    { count: number; amount: number }
  >;
  /** The queue the server actually paged by. */
  serverQueue?: EstimateWorkQueue;
  customers: Customer[];
  jobs: Job[];
  serviceItems: ServiceItem[];
  invoiceDocumentRefs?: InvoiceDocumentRef[];
  canManageEstimates: boolean;
  canManageCustomers?: boolean;
  initialPanelMode?: PanelMode;
  createInitialData?: Partial<EstimateFormData>;
  initialLeadId?: string;
  aiFeaturesEnabled?: boolean;
  /**
   * When true, omit MasterListPageLayout — Sales hub hosts page chrome.
   * Stat strip renders above the list inside the panel.
   */
  embedded?: boolean;
  /** Hub registers New Estimate header action against this handler. */
  onRegisterCreateHandler?: (handler: () => void) => void;
};

function filterEstimates(
  estimates: Estimate[],
  search: string,
  statusFilter: EstimateStatus | "all",
  lifecycleFilter: EstimateLifecycleState,
  customersById: Map<string, Customer>,
  jobsById: Map<string, Job>,
  invoicesByEstimateId: Map<string, string[]>,
): { items: Estimate[]; matchReasons: Record<string, string> } {
  const scoped = estimates.filter((estimate) => {
    const matchesLifecycle =
      getEstimateLifecycleState(estimate) === lifecycleFilter;
    if (!matchesLifecycle) return false;

    const matchesStatus =
      statusFilter === "all" || estimate.status === statusFilter;
    return matchesStatus;
  });

  const query = search.trim();
  if (!query) {
    return { items: scoped, matchReasons: {} };
  }

  const ranked = rankAndSortRecords(scoped, query, (estimate) => {
    const job = estimate.jobId ? jobsById.get(estimate.jobId) : undefined;
    return buildEstimateSearchFields(
      estimate,
      customersById.get(estimate.customerId),
      {
        invoiceNumbers: invoicesByEstimateId.get(estimate.id),
        serviceAddress: job
          ? [job.serviceAddress, job.city, job.state, job.zip]
              .filter(Boolean)
              .join(", ")
          : undefined,
      },
    );
  });

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
}

export function EstimatesPageView({
  initialEstimates,
  serverPage,
  serverQueueMetrics,
  serverQueue,
  customers,
  jobs,
  serviceItems,
  invoiceDocumentRefs = [],
  canManageEstimates,
  canManageCustomers = false,
  initialPanelMode = "empty",
  createInitialData,
  initialLeadId,
  aiFeaturesEnabled = false,
  embedded = false,
  onRegisterCreateHandler,
}: EstimatesPageViewProps) {
  const isServerPaged = Boolean(serverPage);

  const snapshot = useMemo<PagedListSnapshot<Estimate>>(
    () =>
      serverPage ?? {
        rows: initialEstimates,
        nextCursor: null,
        totalCount: initialEstimates.length,
        hasMore: false,
      },
    [serverPage, initialEstimates],
  );

  const paged = usePagedList<Estimate>(
    snapshot,
    useCallback(
      // The queue must match the one the server used for the first page,
      // or load-more continues a different list from where this stopped.
      (cursor) => loadEstimatesPageAction({ queue: serverQueue, cursor }),
      [serverQueue],
    ),
  );

  const [estimates, setEstimates] = useState(initialEstimates);
  const [seenPagedSource, setSeenPagedSource] = useState<Estimate[] | null>(null);
  const incomingRows = isServerPaged ? paged.rows : initialEstimates;
  if (seenPagedSource !== incomingRows) {
    setSeenPagedSource(incomingRows);
    setEstimates(incomingRows);
  }
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [workQueue, setWorkQueue] = useState<EstimateWorkQueue>(
    () => serverQueue ?? resolveDefaultEstimateWorkQueue(),
  );
  const [, setUrlQueue] = useUrlParamState("estimateQueue", "");
  const [statusFilter, setStatusFilter] = useState<EstimateStatus | "all">(
    "all",
  );
  const [lifecycleFilter, setLifecycleFilter] =
    useState<EstimateLifecycleState>("active");
  const [panelMode, setPanelMode] = useState<PanelMode>(initialPanelMode);
  const [createError, setCreateError] = useState<string | null>(null);
  const [batchSendMessage, setBatchSendMessage] = useState<string | null>(null);
  const [batchSendFailureDetails, setBatchSendFailureDetails] = useState<
    string[] | null
  >(null);
  const [batchSendTone, setBatchSendTone] = useState<
    "success" | "warning" | "error"
  >("success");
  const [isPending, startTransition] = useTransition();
  const [isBatchSending, startBatchSendTransition] = useTransition();
  const [lifecycleMessage, setLifecycleMessage] = useState<string | null>(null);
  const [lifecycleFailureDetails, setLifecycleFailureDetails] = useState<
    string[] | null
  >(null);
  const [lifecycleTone, setLifecycleTone] = useState<
    "success" | "warning" | "error"
  >("success");
  const [isBulkArchiving, startBulkArchiveTransition] = useTransition();
  const [isBulkRestoring, startBulkRestoreTransition] = useTransition();
  const [isBulkVoiding, startBulkVoidTransition] = useTransition();
  const [isBulkMovingToTrash, startBulkMoveToTrashTransition] = useTransition();
  const [isBulkRestoringFromTrash, startBulkRestoreFromTrashTransition] =
    useTransition();
  const [isBulkPermanentlyDeleting, startBulkPermanentDeleteTransition] =
    useTransition();
  const router = useRouter();

  useEffect(() => {
    if (!onRegisterCreateHandler) {
      return;
    }

    onRegisterCreateHandler(() => {
      if (!canManageEstimates || customers.length === 0) {
        return;
      }

      router.refresh();
      setPanelMode("create");
      setCreateError(null);
    });
  }, [
    onRegisterCreateHandler,
    canManageEstimates,
    customers.length,
    router,
  ]);

  const batchJobsById = useMemo(
    () => buildJobsByIdForEstimateBatchSend(jobs),
    [jobs],
  );

  const glanceStats = useMemo(
    () =>
      serverQueueMetrics
        ? buildEstimatesGlanceStatsFromMetrics(serverQueueMetrics)
        : buildEstimatesGlanceStats({ estimates }),
    [serverQueueMetrics, estimates],
  );

  const queueScopedEstimates = useMemo(() => {
    // Archived / recently deleted are reached via the lifecycle filter;
    // status pills only scope the active book.
    if (lifecycleFilter !== "active") {
      return estimates;
    }

    // Server-paged rows already have the queue applied in SQL.
    return isServerPaged
      ? estimates
      : filterEstimatesForWorkQueue(estimates, workQueue);
  }, [estimates, isServerPaged, lifecycleFilter, workQueue]);

  const customersById = useMemo(
    () => new Map(customers.map((customer) => [customer.id, customer])),
    [customers],
  );
  const jobsById = useMemo(
    () => new Map(jobs.map((job) => [job.id, job])),
    [jobs],
  );
  const invoicesByEstimateId = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const ref of invoiceDocumentRefs) {
      if (!ref.estimateId) continue;
      const existing = map.get(ref.estimateId) ?? [];
      existing.push(ref.invoiceNumber);
      map.set(ref.estimateId, existing);
    }
    return map;
  }, [invoiceDocumentRefs]);

  const filteredEstimateResult = useMemo(
    () =>
      filterEstimates(
        queueScopedEstimates,
        deferredSearch,
        statusFilter,
        lifecycleFilter,
        customersById,
        jobsById,
        invoicesByEstimateId,
      ),
    [
      queueScopedEstimates,
      deferredSearch,
      statusFilter,
      lifecycleFilter,
      customersById,
      jobsById,
      invoicesByEstimateId,
    ],
  );
  const filteredEstimates = filteredEstimateResult.items;
  const searchMatchReasons = filteredEstimateResult.matchReasons;

  const estimateListPresentation = useMemo(
    () => ({
      sections: [
        {
          id: workQueue,
          label: "",
          items: sortEstimatesForWorkQueue(filteredEstimates, workQueue),
        },
      ],
      showSectionHeaders: false,
    }),
    [filteredEstimates, workQueue],
  );

  const visibleEstimates = useMemo(
    () =>
      estimateListPresentation.sections.flatMap((section) => section.items),
    [estimateListPresentation.sections],
  );

  const selectionEnabled = canManageEstimates;
  const {
    selectedIds: selectedEstimateIds,
    selectedCount,
    selectionState: visibleSelectionState,
    toggleSelection,
    toggleAllVisible,
    clearSelection,
    setSelectedIds: setSelectedEstimateIds,
  } = usePageBulkSelection(visibleEstimates, [
    workQueue,
    statusFilter,
    lifecycleFilter,
    search,
  ]);

  const selectedSendableCount = useMemo(() => {
    if (lifecycleFilter !== "active" || selectedCount === 0) {
      return 0;
    }

    return getBatchSendableEstimates(
      resolveSelectedItems(visibleEstimates, selectedEstimateIds),
      batchJobsById,
    ).length;
  }, [
    batchJobsById,
    lifecycleFilter,
    selectedCount,
    selectedEstimateIds,
    visibleEstimates,
  ]);

  const selectedEstimates = useMemo(
    () => resolveSelectedItems(visibleEstimates, selectedEstimateIds),
    [selectedEstimateIds, visibleEstimates],
  );

  const selectedBulkEligibility = useMemo(
    () =>
      selectedCount === 0
        ? null
        : summarizeEstimateBulkEligibility(selectedEstimates, {
            voidMode: lifecycleFilter === "active" ? "guide" : "lifecycle",
          }),
    [lifecycleFilter, selectedCount, selectedEstimates],
  );

  const activeBulkEligibilityHints = useMemo(
    () =>
      selectedBulkEligibility
        ? formatEstimateBulkEligibilityHints(selectedBulkEligibility, "active")
        : [],
    [selectedBulkEligibility],
  );

  const lifecycleBulkEligibilityHints = useMemo(
    () =>
      selectedBulkEligibility && lifecycleFilter !== "active"
        ? formatEstimateBulkEligibilityHints(
            selectedBulkEligibility,
            lifecycleFilter,
          )
        : [],
    [lifecycleFilter, selectedBulkEligibility],
  );

  const isEstimateLifecycleBusy =
    isBulkArchiving ||
    isBulkRestoring ||
    isBulkVoiding ||
    isBulkMovingToTrash ||
    isBulkRestoringFromTrash ||
    isBulkPermanentlyDeleting;

  function clearBatchSendFeedback() {
    setBatchSendMessage(null);
    setBatchSendFailureDetails(null);
  }

  function clearLifecycleFeedback() {
    setLifecycleMessage(null);
    setLifecycleFailureDetails(null);
  }

  function handleToggleEstimateSelection(estimateId: string) {
    toggleSelection(estimateId);
    clearBatchSendFeedback();
    clearLifecycleFeedback();
  }

  function handleToggleAllVisibleSelection(selectAll: boolean) {
    toggleAllVisible(selectAll);
    clearBatchSendFeedback();
    clearLifecycleFeedback();
  }

  function handleClearSelection() {
    clearSelection();
    clearBatchSendFeedback();
    clearLifecycleFeedback();
  }

  function applyBulkLifecycleResult(input: {
    result: BulkLifecycleActionResult;
    actionLabel: string;
  }) {
    const { result, actionLabel } = input;

    if (result.error && result.results.length === 0) {
      setLifecycleTone("error");
      setLifecycleMessage(
        formatActionError(
          result.error,
          "We couldn't update the selected estimates.",
        ),
      );
      return;
    }

    setSelectedEstimateIds((previous) =>
      pruneBulkSelectionToFailedIds(previous, getBulkLifecycleFailedIds(result)),
    );
    setLifecycleFailureDetails(
      formatBulkLifecycleFailureDetails(result).length > 0
        ? formatBulkLifecycleFailureDetails(result)
        : null,
    );
    setLifecycleTone(
      result.successCount > 0
        ? result.failureCount > 0
          ? "warning"
          : "success"
        : "error",
    );
    setLifecycleMessage(
      formatBulkEstimatesResultMessage({
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
    const ids = [...selectedEstimateIds];
    setLifecycleMessage(null);
    setLifecycleFailureDetails(null);
    startTransitionFn(async () => {
      const result = await action(ids);
      applyBulkLifecycleResult({ result, actionLabel });
    });
  }

  function handleBatchSendSelected() {
    if (!selectionEnabled || selectedCount === 0 || isBatchSending) {
      return;
    }

    const estimateIds = [...selectedEstimateIds];
    setBatchSendMessage(null);
    setBatchSendFailureDetails(null);

    startBatchSendTransition(async () => {
      const result = await batchSendEstimatesAction(estimateIds);

      if (result.error && result.results.length === 0) {
        setBatchSendTone("error");
        setBatchSendMessage(
          formatActionError(result.error, "We couldn't send the selected estimates."),
        );
        return;
      }

      const failedIds = new Set(
        result.results.filter((item) => !item.success).map((item) => item.estimateId),
      );
      const successfulEstimates = result.results
        .filter((item) => item.success && item.estimate)
        .map((item) => item.estimate!);

      if (successfulEstimates.length > 0) {
        const sentById = new Map(
          successfulEstimates.map((estimate) => [estimate.id, estimate]),
        );

        setEstimates((previous) =>
          previous.map((estimate) => sentById.get(estimate.id) ?? estimate),
        );
      }

      setSelectedEstimateIds((previous) => {
        if (failedIds.size === 0) {
          return new Set();
        }

        const next = new Set<string>();
        for (const estimateId of previous) {
          if (failedIds.has(estimateId)) {
            next.add(estimateId);
          }
        }
        return next;
      });

      const failureDetails = result.results
        .filter((item) => !item.success)
        .map(
          (item) => `${item.estimateNumber}: ${item.error ?? "Could not be sent."}`,
        );

      setBatchSendFailureDetails(failureDetails.length > 0 ? failureDetails : null);
      setBatchSendTone(
        result.successCount > 0
          ? result.failureCount > 0
            ? "warning"
            : "success"
          : "error",
      );
      setBatchSendMessage(
        formatBatchSendEstimatesResultMessage({
          successCount: result.successCount,
          failureCount: result.failureCount,
        }),
      );

      if (result.successCount > 0) {
        router.refresh();
      }
    });
  }

  function handleQueueChange(queue: EstimateWorkQueue) {
    setWorkQueue(queue);
    if (isServerPaged) {
      // The pill is a database filter now. Highlighting it without telling
      // the server leaves the previous filter's page on screen.
      setUrlQueue(queue);
    }
    setStatusFilter("all");
    clearBatchSendFeedback();
    clearLifecycleFeedback();
  }

  function handleSelectEstimate(estimate: Estimate) {
    router.push(`/estimates/${estimate.id}`);
  }

  function handleNewEstimate() {
    if (!canManageEstimates) {
      return;
    }

    router.refresh();
    setPanelMode("create");
    setCreateError(null);
  }

  function handleClosePanel() {
    setPanelMode("empty");
    setCreateError(null);
  }

  function handleCreateSubmit(data: EstimateFormData) {
    if (isPending) {
      return;
    }

    setCreateError(null);

    startTransition(async () => {
      const result = await createEstimateAction(
        data,
        initialLeadId ? { leadId: initialLeadId } : undefined,
      );

      if (result.error || !result.estimate) {
        setCreateError(
          formatActionError(
            result.error,
            "We couldn't create this estimate. Check the customer and line items, then try again.",
          ),
        );
        return;
      }

      setEstimates((previous) => [result.estimate!, ...previous]);
      setPanelMode("empty");
      router.push(`/estimates/${result.estimate.id}`);
    });
  }

  const hasNoEstimates = estimates.length === 0;
  const hasNoQueueEstimates =
    !hasNoEstimates && queueScopedEstimates.length === 0;
  const hasNoResults = !hasNoEstimates && filteredEstimates.length === 0;

  const subtitle = "Finish, send, and follow up on estimates.";

  const northStar = isNorthStarShellEnabled();

  const banners =
    lifecycleMessage || batchSendMessage ? (
      <>
        {lifecycleMessage ? (
          <SettingsAlertBanner tone={lifecycleTone}>
            <div>
              <p>{lifecycleMessage}</p>
              {lifecycleFailureDetails?.length ? (
                <ul className="mt-2 list-disc space-y-1 pl-4 text-xs">
                  {lifecycleFailureDetails.map((detail) => (
                    <li key={detail}>{detail}</li>
                  ))}
                </ul>
              ) : null}
            </div>
          </SettingsAlertBanner>
        ) : null}
        {batchSendMessage ? (
          <SettingsAlertBanner tone={batchSendTone}>
            <div>
              <p>{batchSendMessage}</p>
              {batchSendFailureDetails?.length ? (
                <ul className="mt-2 list-disc space-y-1 pl-4 text-xs">
                  {batchSendFailureDetails.map((detail) => (
                    <li key={detail}>{detail}</li>
                  ))}
                </ul>
              ) : null}
            </div>
          </SettingsAlertBanner>
        ) : null}
      </>
    ) : null;

  const panelBody = (
    <>
      <MasterPageSurface
        variant={northStar ? "northStarList" : "workspace"}
        className={`${masterListPageSurfaceClass} ${northStar ? lt.listSurface : ""}`}
      >
        {northStar ? (
          <div aria-hidden="true" className={lt.listSurfaceTopAccent} />
        ) : null}

        <div
          className={
            northStar ? "flex min-h-0 min-w-0 flex-1 flex-col" : "contents"
          }
        >
        {!hasNoEstimates ? (
          <>
            {embedded ? (
              <div className="border-b border-altair-border/70 px-1 pb-2 sm:px-0">
                <EstimatesStatStrip
                  stats={glanceStats}
                  activeQueue={workQueue}
                  onFilterQueue={handleQueueChange}
                />
              </div>
            ) : null}
            <EstimateSearchFilterBar
              search={search}
              statusFilter={statusFilter}
              onSearchChange={setSearch}
              onStatusFilterChange={setStatusFilter}
              resultCount={filteredEstimates.length}
              showStatusFilter={workQueue === "past"}
              lifecycleFilter={lifecycleFilter}
              onLifecycleFilterChange={setLifecycleFilter}
              showLifecycleFilter={canManageEstimates}
              northStar={northStar}
              batchSelectAllControl={
                selectionEnabled &&
                visibleSelectionState &&
                visibleSelectionState.selectableCount > 0 &&
                !hasNoResults
                  ? {
                      selectableCount: visibleSelectionState.selectableCount,
                      allEligibleSelected: visibleSelectionState.allSelected,
                      onCheckAll: () => handleToggleAllVisibleSelection(true),
                      onClearSelection: handleClearSelection,
                    }
                  : undefined
              }
            />
          </>
        ) : null}

        <div className={masterListPageScrollRegionClass}>
          {hasNoEstimates ? (
            <EstimatesEmptyState
              variant="no-estimates"
              needsCustomers={canManageEstimates && customers.length === 0}
              onCreateEstimate={
                canManageEstimates && customers.length > 0
                  ? handleNewEstimate
                  : undefined
              }
              northStar={northStar}
            />
          ) : hasNoQueueEstimates || hasNoResults ? (
            <EstimatesEmptyState variant="no-results" northStar={northStar} />
          ) : (
            <EstimatesTable
              sections={estimateListPresentation.sections}
              showSectionHeaders={estimateListPresentation.showSectionHeaders}
              onSelect={handleSelectEstimate}
              canManageCustomers={canManageCustomers}
              selectionEnabled={selectionEnabled}
              selectedIds={selectedEstimateIds}
              onToggleSelection={handleToggleEstimateSelection}
              onToggleAllVisible={handleToggleAllVisibleSelection}
              northStar={northStar}
              jobsById={jobsById}
              matchReasons={searchMatchReasons}
            />
          )}

          {isServerPaged ? (
            <PagedListFooter
              loadedCount={paged.loadedCount}
              totalCount={paged.totalCount}
              hasMore={paged.hasMore}
              isLoadingMore={paged.isLoadingMore}
              error={paged.error}
              onLoadMore={paged.loadMore}
              noun="estimates"
            />
          ) : null}

          {selectionEnabled && lifecycleFilter === "active" ? (
            <EstimateBatchSelectionBar
              selectedCount={selectedCount}
              sendableCount={selectedSendableCount}
              eligibilityHints={activeBulkEligibilityHints}
              isSending={isBatchSending}
              isLifecycleBusy={isEstimateLifecycleBusy}
              onSendSelected={handleBatchSendSelected}
              onClearSelection={handleClearSelection}
              northStar={northStar}
              archiveAction={
                selectedBulkEligibility &&
                selectedBulkEligibility.archiveEligibleCount > 0
                  ? {
                      eligibleCount: selectedBulkEligibility.archiveEligibleCount,
                      isPending: isBulkArchiving,
                      confirmMessage: formatEstimateBulkActionConfirmMessage(
                        "archive",
                        selectedBulkEligibility,
                      ),
                      onAction: () =>
                        runBulkLifecycle(
                          bulkArchiveEstimatesAction,
                          "Archive",
                          startBulkArchiveTransition,
                        ),
                    }
                  : undefined
              }
              voidAction={
                selectedBulkEligibility &&
                selectedBulkEligibility.voidEligibleCount > 0
                  ? {
                      eligibleCount: selectedBulkEligibility.voidEligibleCount,
                      isPending: isBulkVoiding,
                      confirmMessage: formatEstimateBulkActionConfirmMessage(
                        "void",
                        selectedBulkEligibility,
                      ),
                      onAction: () =>
                        runBulkLifecycle(
                          bulkVoidEstimatesAction,
                          "Void",
                          startBulkVoidTransition,
                        ),
                    }
                  : undefined
              }
              moveToTrashAction={
                selectedBulkEligibility &&
                selectedBulkEligibility.trashEligibleCount > 0
                  ? {
                      eligibleCount: selectedBulkEligibility.trashEligibleCount,
                      isPending: isBulkMovingToTrash,
                      confirmMessage: formatEstimateBulkActionConfirmMessage(
                        "moveToTrash",
                        selectedBulkEligibility,
                      ),
                      onAction: () =>
                        runBulkLifecycle(
                          bulkMoveEstimatesToTrashAction,
                          "Move to Recently Deleted",
                          startBulkMoveToTrashTransition,
                        ),
                    }
                  : undefined
              }
            />
          ) : null}
          {selectionEnabled && selectedCount > 0 && lifecycleFilter !== "active" ? (
            <EntityLifecycleBulkBar
              entityLabel="estimate"
              selectedCount={selectedCount}
              lifecycleFilter={lifecycleFilter}
              eligibilityHints={lifecycleBulkEligibilityHints}
              isArchiving={isBulkArchiving}
              isRestoring={isBulkRestoring}
              isVoiding={isBulkVoiding}
              isMovingToTrash={isBulkMovingToTrash}
              isRestoringFromTrash={isBulkRestoringFromTrash}
              isPermanentlyDeleting={isBulkPermanentlyDeleting}
              showArchive={false}
              showVoid={
                lifecycleFilter === "archived" &&
                (selectedBulkEligibility?.voidEligibleCount ?? 0) > 0
              }
              showMoveToTrash={
                lifecycleFilter === "archived" &&
                (selectedBulkEligibility?.trashEligibleCount ?? 0) > 0
              }
              showRestore={
                lifecycleFilter === "archived" &&
                (selectedBulkEligibility?.restoreEligibleCount ?? 0) > 0
              }
              showRestoreFromTrash={
                lifecycleFilter === "deleted" &&
                (selectedBulkEligibility?.restoreFromTrashEligibleCount ?? 0) > 0
              }
              showPermanentDelete={
                lifecycleFilter === "deleted" &&
                (selectedBulkEligibility?.permanentDeleteEligibleCount ?? 0) > 0
              }
              archiveEligibleCount={selectedBulkEligibility?.archiveEligibleCount}
              restoreEligibleCount={selectedBulkEligibility?.restoreEligibleCount}
              voidEligibleCount={selectedBulkEligibility?.voidEligibleCount}
              moveToTrashEligibleCount={selectedBulkEligibility?.trashEligibleCount}
              restoreFromTrashEligibleCount={
                selectedBulkEligibility?.restoreFromTrashEligibleCount
              }
              permanentDeleteEligibleCount={
                selectedBulkEligibility?.permanentDeleteEligibleCount
              }
              restoreConfirmMessage={
                selectedBulkEligibility
                  ? formatEstimateBulkActionConfirmMessage(
                      "restore",
                      selectedBulkEligibility,
                    )
                  : undefined
              }
              voidConfirmMessage={
                selectedBulkEligibility
                  ? formatEstimateBulkActionConfirmMessage(
                      "void",
                      selectedBulkEligibility,
                    )
                  : undefined
              }
              moveToTrashConfirmMessage={
                selectedBulkEligibility
                  ? formatEstimateBulkActionConfirmMessage(
                      "moveToTrash",
                      selectedBulkEligibility,
                    )
                  : undefined
              }
              restoreFromTrashConfirmMessage={
                selectedBulkEligibility
                  ? formatEstimateBulkActionConfirmMessage(
                      "restoreFromTrash",
                      selectedBulkEligibility,
                    )
                  : undefined
              }
              permanentDeleteConfirmMessage={
                selectedBulkEligibility
                  ? formatEstimateBulkActionConfirmMessage(
                      "permanentDelete",
                      selectedBulkEligibility,
                    )
                  : undefined
              }
              onRestore={() =>
                runBulkLifecycle(
                  bulkRestoreEstimatesAction,
                  "Restore",
                  startBulkRestoreTransition,
                )
              }
              onVoid={() =>
                runBulkLifecycle(
                  bulkVoidEstimatesAction,
                  "Void",
                  startBulkVoidTransition,
                )
              }
              onMoveToTrash={() =>
                runBulkLifecycle(
                  bulkMoveEstimatesToTrashAction,
                  "Move to Recently Deleted",
                  startBulkMoveToTrashTransition,
                )
              }
              onRestoreFromTrash={() =>
                runBulkLifecycle(
                  bulkRestoreEstimatesFromTrashAction,
                  "Restore from Recently Deleted",
                  startBulkRestoreFromTrashTransition,
                )
              }
              onPermanentDelete={() =>
                runBulkLifecycle(
                  bulkPermanentlyDeleteEstimatesAction,
                  "Permanent delete",
                  startBulkPermanentDeleteTransition,
                )
              }
              onClearSelection={handleClearSelection}
            />
          ) : null}
        </div>
        </div>
      </MasterPageSurface>

      <EstimateDetailsPanel
        mode={panelMode}
        customers={customers}
        jobs={jobs}
        serviceItems={serviceItems}
        onClose={handleClosePanel}
        onCreateSubmit={handleCreateSubmit}
        onCreateCancel={handleClosePanel}
        createError={createError}
        isSubmitting={isPending}
        createInitialData={createInitialData}
        aiFeaturesEnabled={aiFeaturesEnabled}
        canDraftDescription={canManageEstimates}
      />
    </>
  );

  if (embedded) {
    return (
      <>
        {banners ? <div className="mb-2 space-y-2">{banners}</div> : null}
        {panelBody}
      </>
    );
  }

  return (
    <MasterListPageLayout
      title="Estimates"
      subtitle={subtitle}
      density="compact"
      headerSurfaceVariant="default"
      headerTitleClassName="min-w-0 text-base font-semibold tracking-tight text-altair-ink-on-paper sm:text-lg"
      headerSubtitleClassName="min-w-0 truncate text-[11px] leading-snug text-altair-ink-on-paper-muted"
      headerClassName="py-1.5"
      headerCenter={
        hasNoEstimates ? undefined : (
          <EstimatesStatStrip
            stats={glanceStats}
            activeQueue={workQueue}
            onFilterQueue={handleQueueChange}
          />
        )
      }
      primaryAction={
        canManageEstimates ? (
          <button
            type="button"
            onClick={handleNewEstimate}
            disabled={customers.length === 0}
            className={
              northStar
                ? `north-star-estimates-primary-action ${lt.primaryAction} disabled:cursor-not-allowed disabled:opacity-60`
                : `${masterListPagePrimaryActionClass} disabled:cursor-not-allowed disabled:opacity-60`
            }
          >
            <Plus className="h-3.5 w-3.5" />
            New Estimate
          </button>
        ) : undefined
      }
      banners={banners ?? undefined}
      className={northStar ? lt.pageCanvas : undefined}
    >
      {panelBody}
    </MasterListPageLayout>
  );
}
