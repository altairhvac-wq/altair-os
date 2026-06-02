"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
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
import { ListCommandCenterLayout } from "@/shared/components/layout/ListCommandCenterLayout";
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
import { ExpenseSummaryCards } from "./ExpenseSummaryCards";
import { ExpensesEmptyState } from "./ExpensesEmptyState";
import { ExpensesTable } from "./ExpensesTable";

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

  const lifecycleScopedExpenses = useMemo(
    () =>
      localExpenses.filter(
        (expense) => getExpenseLifecycleState(expense) === lifecycleFilter,
      ),
    [localExpenses, lifecycleFilter],
  );

  const filteredExpenses = useMemo(
    () => filterExpenses(lifecycleScopedExpenses, listFilters),
    [lifecycleScopedExpenses, listFilters],
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
  } = usePageBulkSelection(filteredExpenses, [lifecycleFilter]);

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

  function handleNeedsReview() {
    setStatusFilter((current) =>
      current === "submitted" ? "all" : "submitted",
    );
  }

  const contextLabel =
    initialJobId && initialJobLabel
      ? `${filteredExpenses.length} expense${filteredExpenses.length === 1 ? "" : "s"} for Job ${initialJobLabel}`
      : initialCustomerId && !initialJobId
        ? filteredExpenses.length === localExpenses.length
          ? null
          : `${filteredExpenses.length} linked expense${filteredExpenses.length === 1 ? "" : "s"}`
        : null;

  function handleClosePanel() {
    setSelectedId(null);
    setPanelMode("empty");
  }

  function handleCreateSuccess() {
    setPanelMode("empty");
    setSelectedId(null);
  }

  const hasNoExpenses = localExpenses.length === 0;
  const hasNoResults = !hasNoExpenses && filteredExpenses.length === 0;
  const isPanelOpen = panelMode !== "empty";

  const subtitle =
    contextLabel ?? "Capture receipts and draft expenses for later review";

  return (
    <ListCommandCenterLayout
      title="Expenses"
      subtitle={subtitle}
      banners={
        initialJobId && initialJobLabel ? (
          <JobContextFilterBanner
            jobLabel={initialJobLabel}
            clearHref="/expenses"
          />
        ) : null
      }
      summary={
        !hasNoExpenses ? (
          <ExpenseSummaryCards expenses={localExpenses} />
        ) : null
      }
      primaryAction={
        <button
          type="button"
          onClick={handleNewExpense}
          className="inline-flex shrink-0 items-center gap-2 admin-btn-primary"
        >
          <Plus className="h-4 w-4" />
          New Expense
        </button>
      }
      className={
        isPanelOpen
          ? "max-lg:h-[calc(100dvh-7rem)] max-lg:min-h-0 max-lg:overflow-hidden"
          : undefined
      }
    >
      <section
        className={`flex min-h-[16rem] min-w-0 lg:flex-1 flex-col overflow-hidden admin-card lg:min-h-0 ${
          isPanelOpen ? "max-lg:hidden" : ""
        }`}
      >
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
            onNeedsReview={handleNeedsReview}
            onClearFilters={handleClearFilters}
            hasActiveFilters={activeFilters}
            resultCount={filteredExpenses.length}
            lifecycleFilter={lifecycleFilter}
            onLifecycleFilterChange={setLifecycleFilter}
            showLifecycleFilter={canManageBilling}
            bulkSelectAllControl={
              selectionEnabled && selectionState.selectableCount > 0
                ? {
                    selectableCount: selectionState.selectableCount,
                    allSelected: selectionState.allSelected,
                    onSelectAll: () => toggleAllVisible(true),
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

        <div className="min-h-0 min-w-0 flex-1 overflow-x-hidden lg:overflow-y-auto">
          {hasNoExpenses ? (
            <ExpensesEmptyState
              variant="no-expenses"
              onCreateExpense={handleNewExpense}
            />
          ) : hasNoResults ? (
            <ExpensesEmptyState variant="no-results" />
          ) : (
            <ExpensesTable
              expenses={filteredExpenses}
              selectedId={selectedId}
              onSelect={handleSelectExpense}
              selectionEnabled={selectionEnabled}
              selectedIds={selectedIds}
              onToggleSelection={toggleSelection}
              onToggleAllVisible={toggleAllVisible}
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
      </section>

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
    </ListCommandCenterLayout>
  );
}
