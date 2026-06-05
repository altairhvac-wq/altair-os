"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import {
  batchSendEstimatesAction,
  createEstimateAction,
} from "@/app/actions/estimates";
import {
  bulkArchiveEstimatesAction,
  bulkMoveEstimatesToTrashAction,
  bulkPermanentlyDeleteEstimatesAction,
  bulkRestoreEstimatesAction,
  bulkRestoreEstimatesFromTrashAction,
  bulkVoidEstimatesAction,
} from "@/app/actions/estimates-bulk-lifecycle";
import { useCompanyTimezone } from "@/shared/lib/company-timezone";
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
import {
  countOperationalActive,
  filterOperationalActive,
} from "@/shared/lib/operational-lifecycle";
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
import { ListCommandCenterLayout } from "@/shared/components/layout/ListCommandCenterLayout";
import { JobsViewTabs, type TodayAllViewTab } from "@/shared/components/jobs/JobsViewTabs";
import { SettingsAlertBanner } from "@/shared/components/settings/SettingsAlertBanner";
import { EstimateBatchSelectionBar } from "./EstimateBatchSelectionBar";
import { EstimateDetailsPanel } from "./EstimateDetailsPanel";
import { EstimateSearchFilterBar } from "./EstimateSearchFilterBar";
import { EstimateSummaryCards } from "./EstimateSummaryCards";
import { EstimatesEmptyState } from "./EstimatesEmptyState";
import { EstimatesTable } from "./EstimatesTable";
import {
  filterEstimatesForTodayView,
  prepareEstimatesForListView,
  prepareEstimatesForTodayView,
} from "@/shared/lib/estimate-workflow-list";
import { formatEstimateStatus } from "@/shared/types/estimate";
import { formatCurrency } from "@/shared/types/customer";

type PanelMode = "create" | "empty";

type EstimatesPageViewProps = {
  initialEstimates: Estimate[];
  customers: Customer[];
  jobs: Job[];
  serviceItems: ServiceItem[];
  canManageEstimates: boolean;
  initialPanelMode?: PanelMode;
  createInitialData?: Partial<EstimateFormData>;
  initialLeadId?: string;
  aiFeaturesEnabled?: boolean;
};

function filterEstimates(
  estimates: Estimate[],
  search: string,
  statusFilter: EstimateStatus | "all",
  lifecycleFilter: EstimateLifecycleState,
): Estimate[] {
  const query = search.trim().toLowerCase();

  return estimates.filter((estimate) => {
    const matchesLifecycle =
      getEstimateLifecycleState(estimate) === lifecycleFilter;

    if (!matchesLifecycle) return false;

    const matchesStatus =
      statusFilter === "all" || estimate.status === statusFilter;

    if (!matchesStatus) return false;
    if (!query) return true;

    const haystack = [
      estimate.estimateNumber,
      estimate.customerName,
      formatEstimateStatus(estimate.status),
      estimate.status,
      formatCurrency(estimate.total),
      String(estimate.total),
    ]
      .join(" ")
      .toLowerCase();

    return haystack.includes(query);
  });
}

export function EstimatesPageView({
  initialEstimates,
  customers,
  jobs,
  serviceItems,
  canManageEstimates,
  initialPanelMode = "empty",
  createInitialData,
  initialLeadId,
  aiFeaturesEnabled = false,
}: EstimatesPageViewProps) {
  const [estimates, setEstimates] = useState(initialEstimates);
  const [search, setSearch] = useState("");
  const [viewTab, setViewTab] = useState<TodayAllViewTab>("today");
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
  const companyTimeZone = useCompanyTimezone();

  const jobsById = useMemo(
    () => new Map(jobs.map((job) => [job.id, job])),
    [jobs],
  );

  const batchJobsById = useMemo(
    () => buildJobsByIdForEstimateBatchSend(jobs),
    [jobs],
  );

  const todayContext = useMemo(
    () => ({
      timeZone: companyTimeZone,
      jobsById,
    }),
    [companyTimeZone, jobsById],
  );

  const todayEstimates = useMemo(
    () => filterEstimatesForTodayView(estimates, todayContext),
    [estimates, todayContext],
  );

  const activeEstimates = useMemo(
    () => filterOperationalActive(estimates, getEstimateLifecycleState),
    [estimates],
  );

  const activeTodayCount = useMemo(
    () => countOperationalActive(todayEstimates, getEstimateLifecycleState),
    [todayEstimates],
  );

  const viewScopedEstimates = useMemo(
    () => (viewTab === "today" ? todayEstimates : estimates),
    [estimates, todayEstimates, viewTab],
  );

  const filteredEstimates = useMemo(
    () =>
      filterEstimates(
        viewScopedEstimates,
        search,
        statusFilter,
        lifecycleFilter,
      ),
    [viewScopedEstimates, search, statusFilter, lifecycleFilter],
  );

  const estimateListPresentation = useMemo(() => {
    if (viewTab === "today") {
      return prepareEstimatesForTodayView(filteredEstimates);
    }

    return prepareEstimatesForListView(filteredEstimates, statusFilter);
  }, [filteredEstimates, statusFilter, viewTab]);

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
    viewTab,
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
  const hasNoTodayEstimates = !hasNoEstimates && todayEstimates.length === 0;
  const hasNoResults = !hasNoEstimates && filteredEstimates.length === 0;

  const subtitle =
    viewTab === "today"
      ? `${activeTodayCount} need attention today`
      : "Create quotes, track approvals, and convert to jobs";

  return (
    <ListCommandCenterLayout
      title="Estimates"
      subtitle={subtitle}
      summary={
        !hasNoEstimates ? (
          <EstimateSummaryCards estimates={activeEstimates} />
        ) : null
      }
      primaryAction={
        canManageEstimates ? (
          <button
            type="button"
            onClick={handleNewEstimate}
            disabled={customers.length === 0}
            className="inline-flex shrink-0 items-center gap-2 admin-btn-primary disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Plus className="h-4 w-4" />
            New Estimate
          </button>
        ) : undefined
      }
    >
      <section className="flex min-h-[16rem] min-w-0 lg:flex-1 flex-col overflow-hidden admin-card lg:min-h-0">
        {!hasNoEstimates ? (
          <div className="shrink-0 border-b border-slate-100/90 px-4 py-2.5">
            <JobsViewTabs
              activeTab={viewTab}
              onTabChange={setViewTab}
              todayCount={activeTodayCount}
              allCount={activeEstimates.length}
              allTabLabel="All"
            />
          </div>
        ) : null}

        {!hasNoEstimates ? (
          <EstimateSearchFilterBar
            search={search}
            statusFilter={statusFilter}
            onSearchChange={setSearch}
            onStatusFilterChange={setStatusFilter}
            resultCount={filteredEstimates.length}
            showStatusFilter={viewTab === "all"}
            lifecycleFilter={lifecycleFilter}
            onLifecycleFilterChange={setLifecycleFilter}
            showLifecycleFilter={canManageEstimates}
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
        ) : null}

        {lifecycleMessage ? (
          <div className="shrink-0 border-b border-slate-100/90 px-4 py-3 sm:px-5">
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
          </div>
        ) : null}

        {batchSendMessage ? (
          <div className="shrink-0 border-b border-slate-100/90 px-4 py-3 sm:px-5">
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
          </div>
        ) : null}

        <div className="min-h-0 min-w-0 flex-1 overflow-x-hidden lg:overflow-y-auto">
          {hasNoEstimates ? (
            <EstimatesEmptyState
              variant="no-estimates"
              needsCustomers={canManageEstimates && customers.length === 0}
              onCreateEstimate={
                canManageEstimates && customers.length > 0
                  ? handleNewEstimate
                  : undefined
              }
            />
          ) : viewTab === "today" && hasNoTodayEstimates ? (
            <EstimatesEmptyState variant="no-today" />
          ) : hasNoResults ? (
            <EstimatesEmptyState variant="no-results" />
          ) : (
            <EstimatesTable
              sections={estimateListPresentation.sections}
              showSectionHeaders={estimateListPresentation.showSectionHeaders}
              onSelect={handleSelectEstimate}
              selectionEnabled={selectionEnabled}
              selectedIds={selectedEstimateIds}
              onToggleSelection={handleToggleEstimateSelection}
              onToggleAllVisible={handleToggleAllVisibleSelection}
            />
          )}

          {selectionEnabled && lifecycleFilter === "active" ? (
            <EstimateBatchSelectionBar
              selectedCount={selectedCount}
              sendableCount={selectedSendableCount}
              eligibilityHints={activeBulkEligibilityHints}
              isSending={isBatchSending}
              isLifecycleBusy={isEstimateLifecycleBusy}
              onSendSelected={handleBatchSendSelected}
              onClearSelection={handleClearSelection}
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
      </section>

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
    </ListCommandCenterLayout>
  );
}
