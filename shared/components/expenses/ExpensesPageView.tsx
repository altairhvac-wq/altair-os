"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
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
import { ExpenseQueueTabs } from "./ExpenseQueueTabs";
import { ExpenseSearchFilterBar } from "./ExpenseSearchFilterBar";
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
  const [localExpenses, setLocalExpenses] = useState(expenses);
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
    () => getExpenseTechnicianOptions(localExpenses),
    [localExpenses],
  );
  const jobOptions = useMemo(
    () => getExpenseJobOptions(localExpenses),
    [localExpenses],
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
      ({
        "needs-review": countExpensesForWorkQueue(localExpenses, "needs-review"),
        uncategorized: countExpensesForWorkQueue(
          localExpenses,
          "uncategorized",
        ),
        approved: countExpensesForWorkQueue(localExpenses, "approved"),
        past: countExpensesForWorkQueue(localExpenses, "past"),
      }) satisfies Record<ExpenseWorkQueue, number>,
    [localExpenses],
  );

  const queueScopedExpenses = useMemo(
    () => filterExpensesForWorkQueue(localExpenses, workQueue),
    [localExpenses, workQueue],
  );

  const lifecycleScopedExpenses = useMemo(
    () =>
      queueScopedExpenses.filter(
        (expense) => getExpenseLifecycleState(expense) === lifecycleFilter,
      ),
    [queueScopedExpenses, lifecycleFilter],
  );

  const filteredExpenses = useMemo(
    () =>
      sortExpensesForWorkQueue(
        filterExpenses(lifecycleScopedExpenses, listFilters),
        workQueue,
      ),
    [lifecycleScopedExpenses, listFilters, workQueue],
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
        {!hasNoExpenses ? (
          <div
            className={
              northStar
                ? lt.viewTabsBand
                : "shrink-0 border-b border-altair-border px-3 py-1.5 sm:px-4"
            }
          >
            <ExpenseQueueTabs
              activeQueue={workQueue}
              onQueueChange={setWorkQueue}
              counts={queueCounts}
              northStar={northStar}
            />
          </div>
        ) : null}

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
            resultCount={filteredExpenses.length}
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
