"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { loadExpensesPageAction } from "@/app/actions/list-pages";
import { PagedListFooter } from "@/shared/components/lists/PagedListFooter";
import {
  usePagedList,
  type PagedListSnapshot,
} from "@/shared/components/lists/usePagedList";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { isNorthStarShellEnabled } from "@/lib/beta/north-star-shell";
import {
  bulkArchiveExpensesAction,
  bulkMoveExpensesToTrashAction,
  bulkPermanentlyDeleteExpensesAction,
  bulkRestoreExpensesAction,
  bulkRestoreExpensesFromTrashAction,
} from "@/app/actions/expenses-bulk-lifecycle";
import { usePageBulkSelection } from "@/shared/hooks/usePageBulkSelection";
import {
  formatBulkLifecycleFailureDetails,
  getBulkLifecycleFailedIds,
  pruneBulkSelectionToFailedIds,
  type BulkLifecycleActionResult,
} from "@/shared/lib/bulk-lifecycle-runner";
import {
  formatBulkExpensesResultMessage,
  getExpenseLifecycleState,
} from "@/shared/lib/expense-lifecycle";
import { formatActionError } from "@/shared/lib/operational-errors";
import { EntityLifecycleBulkBar } from "@/shared/components/lifecycle/EntityLifecycleBulkBar";
import type {
  Expense,
  ExpenseCategory,
  ExpenseDateFilter,
  ExpenseLifecycleState,
  ExpensePaymentFilter,
  ExpenseReceiptFilter,
  ExpenseStatus,
} from "@/shared/types/expense";
import {
  MasterListPageLayout,
  MasterPageSurface,
  masterListPagePrimaryActionClass,
  masterListPageScrollRegionClass,
  masterListPageSurfaceClass,
} from "@/shared/design-system/shell";
import { northStarListTokens as lt } from "@/shared/design-system/north-star/tokens";
import { JobContextFilterBanner } from "@/shared/components/layout/JobContextFilterBanner";
import { SettingsAlertBanner } from "@/shared/components/settings/SettingsAlertBanner";
import {
  filterExpenses,
  getExpenseJobOptions,
  getExpenseTechnicianOptions,
  hasActiveExpenseFilters,
} from "@/shared/utils/expense-filters";
import { ExpenseDetailsPanel } from "./ExpenseDetailsPanel";
import { ExpenseSearchFilterBar } from "./ExpenseSearchFilterBar";
import { ExpenseStatStrip } from "./ExpenseStatStrip";
import { ExpensesEmptyState } from "./ExpensesEmptyState";
import { ExpensesTable } from "./ExpensesTable";
import {
  countExpensesForWorkQueue,
  filterExpensesForWorkQueue,
  resolveDefaultExpenseWorkQueue,
  sortExpensesForWorkQueue,
  type ExpenseWorkQueue,
} from "./expense-work-queues";

type PanelMode = "detail" | "create" | "empty";

type ExpensesPageViewProps = {
  expenses: Expense[];
  currentUserId: string;
  canManageBilling: boolean;
  canDispatchJobs: boolean;
  initialJobId?: string;
  initialJobLabel?: string;
  initialCustomerId?: string;
  initialSelectedId?: string;
  initialCreate?: boolean;
  initialStatusFilter?: ExpenseStatus | "all";
  /**
   * One server-paged page of expenses.
   *
   * When present the rows already have the queue, the eight filters and the
   * lifecycle scope applied in SQL, so the client-side equivalents are skipped
   * rather than run a second time over a subset.
   */
  serverPage?: PagedListSnapshot<Expense>;
  /** Queue counts over the WHOLE tenant, not this page. */
  serverQueueCounts?: Record<ExpenseWorkQueue, number>;
  /**
   * Dropdown options from their own bounded sources.
   *
   * Deriving these from the loaded page would offer only whichever technicians
   * and jobs happened to appear in 50 rows — so a filter the user needs would
   * simply not be listed.
   */
  filterOptions?: {
    technicians: { id: string; name: string }[];
    jobs: { id: string; jobNumber: string }[];
  };
};

const DEFAULT_FILTERS = {
  search: "",
  statusFilter: "all" as ExpenseStatus | "all",
  categoryFilter: "all" as ExpenseCategory | "all",
  technicianFilter: "all",
  jobFilter: "all",
  paymentFilter: "all" as ExpensePaymentFilter,
  dateFilter: "all" as ExpenseDateFilter,
  receiptFilter: "all" as ExpenseReceiptFilter,
};

export function ExpensesPageView({
  expenses,
  currentUserId,
  canManageBilling,
  canDispatchJobs,
  initialJobId,
  initialJobLabel,
  initialCustomerId,
  initialSelectedId,
  initialCreate = false,
  initialStatusFilter = DEFAULT_FILTERS.statusFilter,
  serverPage,
  serverQueueCounts,
  filterOptions,
}: ExpensesPageViewProps) {
  const [search, setSearch] = useState(DEFAULT_FILTERS.search);
  const [workQueue, setWorkQueue] = useState<ExpenseWorkQueue>(() =>
    initialStatusFilter === "submitted"
      ? "needs-review"
      : resolveDefaultExpenseWorkQueue(expenses),
  );
  const [statusFilter, setStatusFilter] = useState(initialStatusFilter);
  const [categoryFilter, setCategoryFilter] = useState(
    DEFAULT_FILTERS.categoryFilter,
  );
  const [technicianFilter, setTechnicianFilter] = useState(
    DEFAULT_FILTERS.technicianFilter,
  );
  const [jobFilter, setJobFilter] = useState(DEFAULT_FILTERS.jobFilter);
  const [paymentFilter, setPaymentFilter] = useState(
    DEFAULT_FILTERS.paymentFilter,
  );
  const [dateFilter, setDateFilter] = useState(DEFAULT_FILTERS.dateFilter);
  const [receiptFilter, setReceiptFilter] = useState(
    DEFAULT_FILTERS.receiptFilter,
  );
  const [lifecycleFilter, setLifecycleFilter] =
    useState<ExpenseLifecycleState>("active");
  const [selectedId, setSelectedId] = useState<string | null>(
    initialSelectedId ?? null,
  );
  const [panelMode, setPanelMode] = useState<PanelMode>(() => {
    if (initialCreate) return "create";
    if (initialSelectedId) return "detail";
    return "empty";
  });
  const [createJobId] = useState(initialJobId);
  const isServerPaged = Boolean(serverPage);

  const snapshot = useMemo<PagedListSnapshot<Expense>>(
    () =>
      serverPage ?? {
        rows: expenses,
        nextCursor: null,
        totalCount: expenses.length,
        hasMore: false,
      },
    [serverPage, expenses],
  );

  const paged = usePagedList<Expense>(
    snapshot,
    useCallback(
      (cursor) => loadExpensesPageAction({ cursor }),
      [],
    ),
  );

  const [localExpenses, setLocalExpenses] = useState(expenses);
  const [seenSource, setSeenSource] = useState<Expense[] | null>(null);
  const incomingExpenses = isServerPaged ? paged.rows : expenses;
  if (seenSource !== incomingExpenses) {
    setSeenSource(incomingExpenses);
    setLocalExpenses(incomingExpenses);
  }
  const [lifecycleMessage, setLifecycleMessage] = useState<string | null>(null);
  const [lifecycleFailureDetails, setLifecycleFailureDetails] = useState<
    string[] | null
  >(null);
  const [lifecycleTone, setLifecycleTone] = useState<
    "success" | "warning" | "error"
  >("success");
  const [isBulkArchiving, startBulkArchiveTransition] = useTransition();
  const [isBulkRestoring, startBulkRestoreTransition] = useTransition();
  const [isBulkMovingToTrash, startBulkMoveToTrashTransition] = useTransition();
  const [isBulkRestoringFromTrash, startBulkRestoreFromTrashTransition] =
    useTransition();
  const [isBulkPermanentlyDeleting, startBulkPermanentDeleteTransition] =
    useTransition();
  const router = useRouter();

  useEffect(() => {
    setLocalExpenses(expenses);
  }, [expenses]);

  useEffect(() => {
    if (
      initialSelectedId &&
      expenses.some((expense) => expense.id === initialSelectedId)
    ) {
      setSelectedId(initialSelectedId);
      setPanelMode("detail");
    }
  }, [expenses, initialSelectedId]);

  const technicianOptions = useMemo(
    () =>
      filterOptions
        ? filterOptions.technicians.map((t) => ({ value: t.id, label: t.name }))
        : getExpenseTechnicianOptions(localExpenses),
    [filterOptions, localExpenses],
  );
  const jobOptions = useMemo(
    () =>
      filterOptions
        ? filterOptions.jobs.map((j) => ({ value: j.id, label: j.jobNumber }))
        : getExpenseJobOptions(localExpenses),
    [filterOptions, localExpenses],
  );

  const listFilters = useMemo(
    () => ({
      search,
      statusFilter,
      categoryFilter,
      technicianFilter,
      jobFilter,
      paymentFilter,
      dateFilter,
      receiptFilter,
      jobIdFilter: initialJobId,
      customerIdFilter: initialCustomerId,
    }),
    [
      search,
      statusFilter,
      categoryFilter,
      technicianFilter,
      jobFilter,
      paymentFilter,
      dateFilter,
      receiptFilter,
      initialJobId,
      initialCustomerId,
    ],
  );

  const queueCounts = useMemo(
    () =>
      serverQueueCounts ??
      ({
        "needs-review": countExpensesForWorkQueue(localExpenses, "needs-review"),
        uncategorized: countExpensesForWorkQueue(
          localExpenses,
          "uncategorized",
        ),
        approved: countExpensesForWorkQueue(localExpenses, "approved"),
        past: countExpensesForWorkQueue(localExpenses, "past"),
      } satisfies Record<ExpenseWorkQueue, number>),
    [localExpenses, serverQueueCounts],
  );

  const queueScopedExpenses = useMemo(
    () =>
      isServerPaged
        ? localExpenses
        : filterExpensesForWorkQueue(localExpenses, workQueue),
    [isServerPaged, localExpenses, workQueue],
  );

  const lifecycleScopedExpenses = useMemo(
    () =>
      isServerPaged
        ? queueScopedExpenses
        : queueScopedExpenses.filter(
            (expense) => getExpenseLifecycleState(expense) === lifecycleFilter,
          ),
    [isServerPaged, queueScopedExpenses, lifecycleFilter],
  );

  const filteredExpenses = useMemo(
    () =>
      sortExpensesForWorkQueue(
        // Server-paged rows already have the queue and all eight filters
        // applied in SQL. Re-running filterExpenses over them would be a second
        // copy of the same rule evaluated against a subset of the data — which
        // is what made these numbers wrong in the first place. The sort stays:
        // it orders the page, it does not select it.
        isServerPaged
          ? lifecycleScopedExpenses
          : filterExpenses(lifecycleScopedExpenses, listFilters),
        workQueue,
      ),
    [isServerPaged, lifecycleScopedExpenses, listFilters, workQueue],
  );

  const selectionEnabled = canManageBilling;
  const {
    selectedIds,
    selectedCount,
    selectionState,
    toggleSelection,
    toggleAllVisible,
    clearSelection,
    setSelectedIds,
  } = usePageBulkSelection(filteredExpenses, [lifecycleFilter, workQueue]);

  useEffect(() => {
    clearSelection();
    setLifecycleMessage(null);
    setLifecycleFailureDetails(null);
  }, [lifecycleFilter, workQueue, statusFilter, clearSelection]);

  function handleClearSelection() {
    clearSelection();
    setLifecycleMessage(null);
    setLifecycleFailureDetails(null);
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
          "We couldn't update the selected expenses.",
        ),
      );
      return;
    }

    setSelectedIds((previous) =>
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
      formatBulkExpensesResultMessage({
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
    setLifecycleMessage(null);
    setLifecycleFailureDetails(null);
    startTransitionFn(async () => {
      const result = await action(ids);
      applyBulkLifecycleResult({ result, actionLabel });
    });
  }

  const activeFilters = hasActiveExpenseFilters(listFilters);

  const selectedExpense =
    localExpenses.find((exp) => exp.id === selectedId) ?? null;

  function handleExpenseUpdated(updated: Expense) {
    setLocalExpenses((current) =>
      current.map((expense) =>
        expense.id === updated.id ? updated : expense,
      ),
    );
  }

  function handleSelectExpense(expense: Expense) {
    setSelectedId(expense.id);
    setPanelMode("detail");
  }

  function handleNewExpense() {
    setSelectedId(null);
    setPanelMode("create");
  }

  function handleClearFilters() {
    setSearch(DEFAULT_FILTERS.search);
    setStatusFilter(DEFAULT_FILTERS.statusFilter);
    setCategoryFilter(DEFAULT_FILTERS.categoryFilter);
    setTechnicianFilter(DEFAULT_FILTERS.technicianFilter);
    setJobFilter(DEFAULT_FILTERS.jobFilter);
    setPaymentFilter(DEFAULT_FILTERS.paymentFilter);
    setDateFilter(DEFAULT_FILTERS.dateFilter);
    setReceiptFilter(DEFAULT_FILTERS.receiptFilter);
  }

  function handleClosePanel() {
    setSelectedId(null);
    setPanelMode("empty");
  }

  function handleCreateSuccess() {
    setPanelMode("empty");
    setSelectedId(null);
  }

  const hasNoExpenses = localExpenses.length === 0;
  const hasNoQueueExpenses = !hasNoExpenses && queueScopedExpenses.length === 0;
  const hasNoResults = !hasNoExpenses && filteredExpenses.length === 0;

  const subtitle = "Review, categorize, and approve company spending.";

  const northStar = isNorthStarShellEnabled();

  return (
    <MasterListPageLayout
      title="Expenses"
      subtitle={subtitle}
      density="compact"
      banners={
        (initialJobId && initialJobLabel) || lifecycleMessage ? (
          <>
            {initialJobId && initialJobLabel ? (
              <JobContextFilterBanner
                jobLabel={initialJobLabel}
                clearHref="/expenses"
              />
            ) : null}
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
          </>
        ) : undefined
      }
      primaryAction={
        <button
          type="button"
          onClick={handleNewExpense}
          className={
            northStar
              ? `north-star-expenses-primary-action ${lt.primaryAction}`
              : masterListPagePrimaryActionClass
          }
        >
          <Plus className="h-3.5 w-3.5" />
          New Expense
        </button>
      }
      className={northStar ? lt.pageCanvas : undefined}
      headerClassName={
        northStar ? `${lt.pageHeader} north-star-expenses-page-header` : undefined
      }
      headerSurfaceVariant={northStar ? "northStar" : "default"}
      headerEyebrowClassName={northStar ? lt.pageHeaderEyebrow : undefined}
      headerTitleClassName={northStar ? lt.pageHeaderTitle : undefined}
      headerSubtitleClassName={northStar ? lt.pageHeaderSubtitle : undefined}
      summary={
        !hasNoExpenses ? (
          <ExpenseStatStrip
            counts={queueCounts}
            activeQueue={workQueue}
            onQueueChange={setWorkQueue}
          />
        ) : undefined
      }
    >
      <MasterPageSurface
        variant={northStar ? "northStarList" : "workspace"}
        className={`${masterListPageSurfaceClass} max-w-full ${northStar ? lt.listSurface : ""}`}
      >
        {northStar ? (
          <div aria-hidden="true" className={lt.listSurfaceTopAccent} />
        ) : null}

        <div
          className={
            northStar ? "flex min-h-0 min-w-0 flex-1 flex-col" : "contents"
          }
        >
        {/* Queue switching moved to ExpenseStatStrip in the page header
            (summary slot) — the retired ExpenseQueueTabs band is gone. */}
        {!hasNoExpenses ? (
          <ExpenseSearchFilterBar
            search={search}
            statusFilter={statusFilter}
            categoryFilter={categoryFilter}
            technicianFilter={technicianFilter}
            jobFilter={jobFilter}
            paymentFilter={paymentFilter}
            dateFilter={dateFilter}
            receiptFilter={receiptFilter}
            technicianOptions={technicianOptions}
            jobOptions={jobOptions}
            showTechnicianFilter={technicianOptions.length > 1}
            showJobFilter={!initialJobId && jobOptions.length > 0}
            onSearchChange={setSearch}
            onStatusFilterChange={setStatusFilter}
            onCategoryFilterChange={setCategoryFilter}
            onTechnicianFilterChange={setTechnicianFilter}
            onJobFilterChange={setJobFilter}
            onPaymentFilterChange={setPaymentFilter}
            onDateFilterChange={setDateFilter}
            onReceiptFilterChange={setReceiptFilter}
            onClearFilters={handleClearFilters}
            hasActiveFilters={activeFilters}
            resultCount={isServerPaged ? paged.totalCount : filteredExpenses.length}
            lifecycleFilter={lifecycleFilter}
            onLifecycleFilterChange={setLifecycleFilter}
            showLifecycleFilter={canManageBilling}
            showStatusFilter={workQueue === "past"}
            bulkSelectAllControl={
              selectionEnabled &&
              selectionState.selectableCount > 0 &&
              !hasNoResults
                ? {
                    selectableCount: selectionState.selectableCount,
                    allSelected: selectionState.allSelected,
                    onSelectAll: () => toggleAllVisible(true),
                    onClearSelection: handleClearSelection,
                  }
                : undefined
            }
            northStar={northStar}
          />
        ) : null}

        <div className={masterListPageScrollRegionClass}>
          {hasNoExpenses ? (
            <ExpensesEmptyState
              variant="no-expenses"
              onCreateExpense={handleNewExpense}
              northStar={northStar}
            />
          ) : hasNoQueueExpenses || hasNoResults ? (
            <ExpensesEmptyState
              variant="no-results"
              workQueue={workQueue}
              filterEmpty={hasNoResults && !hasNoQueueExpenses}
              northStar={northStar}
            />
          ) : (
            <>
              <ExpensesTable
                expenses={filteredExpenses}
                selectedId={selectedId}
                onSelect={handleSelectExpense}
                selectionEnabled={selectionEnabled}
                selectedIds={selectedIds}
                onToggleSelection={toggleSelection}
                onToggleAllVisible={toggleAllVisible}
                northStar={northStar}
              />
              {isServerPaged ? (
                <PagedListFooter
                  loadedCount={paged.loadedCount}
                  totalCount={paged.totalCount}
                  hasMore={paged.hasMore}
                  isLoadingMore={paged.isLoadingMore}
                  error={paged.error}
                  onLoadMore={paged.loadMore}
                  noun="expenses"
                />
              ) : null}
            </>
          )}

          {selectionEnabled && selectedCount > 0 ? (
            <EntityLifecycleBulkBar
              entityLabel="expense"
              selectedCount={selectedCount}
              lifecycleFilter={lifecycleFilter}
              isArchiving={isBulkArchiving}
              isRestoring={isBulkRestoring}
              isMovingToTrash={isBulkMovingToTrash}
              isRestoringFromTrash={isBulkRestoringFromTrash}
              isPermanentlyDeleting={isBulkPermanentlyDeleting}
              showArchive={lifecycleFilter === "active"}
              showMoveToTrash={
                lifecycleFilter === "active" || lifecycleFilter === "archived"
              }
              showRestore={lifecycleFilter === "archived"}
              showRestoreFromTrash={lifecycleFilter === "deleted"}
              showPermanentDelete={lifecycleFilter === "deleted"}
              northStar={northStar}
              onArchive={() =>
                runBulkLifecycle(
                  bulkArchiveExpensesAction,
                  "Archive",
                  startBulkArchiveTransition,
                )
              }
              onRestore={() =>
                runBulkLifecycle(
                  bulkRestoreExpensesAction,
                  "Restore",
                  startBulkRestoreTransition,
                )
              }
              onMoveToTrash={() =>
                runBulkLifecycle(
                  bulkMoveExpensesToTrashAction,
                  "Move to Recently Deleted",
                  startBulkMoveToTrashTransition,
                )
              }
              onRestoreFromTrash={() =>
                runBulkLifecycle(
                  bulkRestoreExpensesFromTrashAction,
                  "Restore from Recently Deleted",
                  startBulkRestoreFromTrashTransition,
                )
              }
              onPermanentDelete={() =>
                runBulkLifecycle(
                  bulkPermanentlyDeleteExpensesAction,
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

      <ExpenseDetailsPanel
        mode={panelMode}
        expense={selectedExpense}
        createJobId={createJobId}
        currentUserId={currentUserId}
        canManageBilling={canManageBilling}
        canDispatchJobs={canDispatchJobs}
        onClose={handleClosePanel}
        onCreateSuccess={handleCreateSuccess}
        onCreateCancel={handleClosePanel}
        onExpenseUpdated={handleExpenseUpdated}
      />
    </MasterListPageLayout>
  );
}
