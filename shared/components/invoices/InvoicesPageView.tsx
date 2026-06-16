"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import {
  batchSendInvoicesAction,
  createInvoiceAction,
} from "@/app/actions/invoices";
import {
  bulkArchiveInvoicesAction,
  bulkMoveInvoicesToTrashAction,
  bulkPermanentlyDeleteInvoicesAction,
  bulkRestoreInvoicesAction,
  bulkRestoreInvoicesFromTrashAction,
  bulkVoidInvoicesAction,
} from "@/app/actions/invoices-bulk-lifecycle";
import { useCompanyTimezone } from "@/shared/lib/company-timezone";
import {
  resolveBulkSelectionState,
  resolveSelectedItems,
  toggleBulkSelection,
  toggleGroupBulkSelection,
} from "@/shared/lib/bulk-selection";
import {
  formatBulkLifecycleFailureDetails,
  getBulkLifecycleFailedIds,
  pruneBulkSelectionToFailedIds,
  type BulkLifecycleActionResult,
} from "@/shared/lib/bulk-lifecycle-runner";
import {
  formatBulkInvoicesResultMessage,
  formatInvoiceBulkActionConfirmMessage,
  formatInvoiceBulkEligibilityHints,
  getInvoiceLifecycleState,
  summarizeInvoiceBulkEligibility,
} from "@/shared/lib/invoice-lifecycle";
import {
  countOperationalActive,
  filterOperationalActive,
} from "@/shared/lib/operational-lifecycle";
import {
  buildJobsByIdForBatchSend,
  formatBatchSendInvoicesResultMessage,
  getBatchSendableInvoices,
} from "@/shared/lib/invoice-batch-send";
import { formatActionError } from "@/shared/lib/operational-errors";
import { EntityLifecycleBulkBar } from "@/shared/components/lifecycle/EntityLifecycleBulkBar";
import type { Customer } from "@/shared/types/customer";
import type { Job } from "@/shared/types/job";
import type { ServiceItem } from "@/shared/types/service-item";
import {
  formatInvoiceStatus,
  type Invoice,
  type InvoiceFormData,
  type InvoiceLifecycleState,
} from "@/shared/types/invoice";
import {
  matchesInvoiceListStatusFilter,
  sortInvoicesForCashFlowFocus,
  type InvoiceListStatusFilter,
  type InvoicePageFocusState,
} from "@/shared/lib/invoice-page-focus";
import {
  filterInvoicesForTodayView,
  prepareInvoicesForListView,
  prepareInvoicesForTodayView,
} from "@/shared/lib/invoice-workflow-list";
import { formatCurrency } from "@/shared/types/customer";
import {
  MasterListPageLayout,
  MasterPageSurface,
} from "@/shared/design-system/shell";
import { JobContextFilterBanner } from "@/shared/components/layout/JobContextFilterBanner";
import { JobsViewTabs, type TodayAllViewTab } from "@/shared/components/jobs/JobsViewTabs";
import { SettingsAlertBanner } from "@/shared/components/settings/SettingsAlertBanner";
import { InvoiceBatchSelectionBar } from "./InvoiceBatchSelectionBar";
import { InvoiceCashFlowFocusBanner } from "./InvoiceCashFlowFocusBanner";
import { InvoiceDetailsPanel } from "./InvoiceDetailsPanel";
import { InvoiceSearchFilterBar } from "./InvoiceSearchFilterBar";
import { InvoiceSummaryCards } from "./InvoiceSummaryCards";
import { InvoicesEmptyState } from "./InvoicesEmptyState";
import { InvoicesTable } from "./InvoicesTable";

type PanelMode = "create" | "empty";

type InvoicesPageViewProps = {
  initialInvoices: Invoice[];
  customers: Customer[];
  jobs: Job[];
  serviceItems: ServiceItem[];
  canManageInvoices: boolean;
  canManageCustomers?: boolean;
  initialPanelMode?: PanelMode;
  createInitialData?: Partial<InvoiceFormData>;
  initialJobId?: string;
  initialJobLabel?: string;
  initialCreateMode?: boolean;
  initialStatusFilter?: InvoiceListStatusFilter;
  invoicePageFocus?: InvoicePageFocusState;
};

function filterInvoices(
  invoices: Invoice[],
  search: string,
  statusFilter: InvoiceListStatusFilter,
  lifecycleFilter: InvoiceLifecycleState,
  jobIdFilter?: string,
  prioritizeCashFlow = false,
): Invoice[] {
  const query = search.trim().toLowerCase();

  const filtered = invoices.filter((invoice) => {
    const matchesLifecycle =
      getInvoiceLifecycleState(invoice) === lifecycleFilter;
    const matchesJob = !jobIdFilter || invoice.jobId === jobIdFilter;
    const matchesStatus = matchesInvoiceListStatusFilter(invoice, statusFilter);

    if (!matchesLifecycle || !matchesJob || !matchesStatus) return false;
    if (!query) return true;

    const haystack = [
      invoice.invoiceNumber,
      invoice.customerName,
      formatInvoiceStatus(invoice.status),
      invoice.status,
      invoice.jobNumber,
      invoice.estimateNumber,
      formatCurrency(invoice.total),
      String(invoice.total),
    ]
      .join(" ")
      .toLowerCase();

    return haystack.includes(query);
  });

  return prioritizeCashFlow
    ? sortInvoicesForCashFlowFocus(filtered)
    : filtered;
}

const CASH_FLOW_HIGHLIGHT_MAP: Record<
  string,
  "Needs attention" | "Overdue" | "Due today" | "Unpaid total" | "Paid this month"
> = {
  Unpaid: "Unpaid total",
  Overdue: "Overdue",
  Paid: "Paid this month",
};

export function InvoicesPageView({
  initialInvoices,
  customers,
  jobs,
  serviceItems,
  canManageInvoices,
  canManageCustomers = false,
  initialPanelMode = "empty",
  createInitialData,
  initialJobId,
  initialJobLabel,
  initialCreateMode = false,
  initialStatusFilter = "all",
  invoicePageFocus,
}: InvoicesPageViewProps) {
  const [invoices, setInvoices] = useState(initialInvoices);
  const [search, setSearch] = useState("");
  const [viewTab, setViewTab] = useState<TodayAllViewTab>("today");
  const [statusFilter, setStatusFilter] =
    useState<InvoiceListStatusFilter>(initialStatusFilter);
  const [lifecycleFilter, setLifecycleFilter] =
    useState<InvoiceLifecycleState>("active");
  const [panelMode, setPanelMode] = useState<PanelMode>(initialPanelMode);
  const [createError, setCreateError] = useState<string | null>(null);
  const [selectedInvoiceIds, setSelectedInvoiceIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [batchSendMessage, setBatchSendMessage] = useState<string | null>(null);
  const [batchSendFailureDetails, setBatchSendFailureDetails] = useState<
    string[] | null
  >(null);
  const [batchSendTone, setBatchSendTone] = useState<
    "success" | "warning" | "error"
  >("success");
  const [lifecycleMessage, setLifecycleMessage] = useState<string | null>(null);
  const [lifecycleFailureDetails, setLifecycleFailureDetails] = useState<
    string[] | null
  >(null);
  const [lifecycleTone, setLifecycleTone] = useState<
    "success" | "warning" | "error"
  >("success");
  const [isPending, startTransition] = useTransition();
  const [isBatchSending, startBatchSendTransition] = useTransition();
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

  useEffect(() => {
    setInvoices(initialInvoices);
  }, [initialInvoices]);

  useEffect(() => {
    setSelectedInvoiceIds(new Set());
    setBatchSendMessage(null);
    setBatchSendFailureDetails(null);
    setLifecycleMessage(null);
    setLifecycleFailureDetails(null);
  }, [lifecycleFilter]);

  const prioritizeCashFlow = invoicePageFocus?.focus === "cash-flow";

  const todayContext = useMemo(
    () => ({
      timeZone: companyTimeZone,
    }),
    [companyTimeZone],
  );

  const todayInvoices = useMemo(
    () => filterInvoicesForTodayView(invoices, todayContext),
    [invoices, todayContext],
  );

  const activeInvoices = useMemo(
    () => filterOperationalActive(invoices, getInvoiceLifecycleState),
    [invoices],
  );

  const activeTodayCount = useMemo(
    () => countOperationalActive(todayInvoices, getInvoiceLifecycleState),
    [todayInvoices],
  );

  const viewScopedInvoices = useMemo(
    () => (viewTab === "today" ? todayInvoices : invoices),
    [invoices, todayInvoices, viewTab],
  );

  const filteredInvoices = useMemo(
    () =>
      filterInvoices(
        viewScopedInvoices,
        search,
        statusFilter,
        lifecycleFilter,
        initialJobId,
        prioritizeCashFlow,
      ),
    [
      viewScopedInvoices,
      search,
      statusFilter,
      lifecycleFilter,
      initialJobId,
      prioritizeCashFlow,
    ],
  );

  const invoiceListPresentation = useMemo(() => {
    if (viewTab === "today") {
      return prepareInvoicesForTodayView(filteredInvoices);
    }

    return prepareInvoicesForListView(
      filteredInvoices,
      statusFilter,
      prioritizeCashFlow,
    );
  }, [filteredInvoices, prioritizeCashFlow, statusFilter, viewTab]);

  const jobsById = useMemo(() => buildJobsByIdForBatchSend(jobs), [jobs]);

  const visibleInvoices = useMemo(
    () =>
      invoiceListPresentation.sections.flatMap((section) => section.items),
    [invoiceListPresentation.sections],
  );

  const selectionEnabled = canManageInvoices;
  const selectedCount = selectedInvoiceIds.size;

  const visibleSelectionState = useMemo(
    () =>
      selectionEnabled
        ? resolveBulkSelectionState(selectedInvoiceIds, visibleInvoices)
        : null,
    [selectedInvoiceIds, selectionEnabled, visibleInvoices],
  );

  const selectedSendableCount = useMemo(() => {
    if (lifecycleFilter !== "active" || selectedCount === 0) {
      return 0;
    }

    return getBatchSendableInvoices(
      resolveSelectedItems(visibleInvoices, selectedInvoiceIds),
      jobsById,
    ).length;
  }, [
    jobsById,
    lifecycleFilter,
    selectedCount,
    selectedInvoiceIds,
    visibleInvoices,
  ]);

  const selectedInvoices = useMemo(
    () => resolveSelectedItems(visibleInvoices, selectedInvoiceIds),
    [selectedInvoiceIds, visibleInvoices],
  );

  const selectedBulkEligibility = useMemo(
    () =>
      selectedCount === 0
        ? null
        : summarizeInvoiceBulkEligibility(selectedInvoices, {
            jobsById,
            voidMode: lifecycleFilter === "active" ? "guide" : "lifecycle",
          }),
    [jobsById, lifecycleFilter, selectedCount, selectedInvoices],
  );

  const activeBulkEligibilityHints = useMemo(
    () =>
      selectedBulkEligibility
        ? formatInvoiceBulkEligibilityHints(selectedBulkEligibility, "active", {
            includeSend: true,
          })
        : [],
    [selectedBulkEligibility],
  );

  const lifecycleBulkEligibilityHints = useMemo(
    () =>
      selectedBulkEligibility && lifecycleFilter !== "active"
        ? formatInvoiceBulkEligibilityHints(
            selectedBulkEligibility,
            lifecycleFilter,
          )
        : [],
    [lifecycleFilter, selectedBulkEligibility],
  );

  const isInvoiceLifecycleBusy =
    isBulkArchiving ||
    isBulkRestoring ||
    isBulkVoiding ||
    isBulkMovingToTrash ||
    isBulkRestoringFromTrash ||
    isBulkPermanentlyDeleting;

  function handleToggleInvoiceSelection(invoiceId: string) {
    setSelectedInvoiceIds((previous) =>
      toggleBulkSelection(previous, invoiceId),
    );
    setBatchSendMessage(null);
    setBatchSendFailureDetails(null);
    setLifecycleMessage(null);
    setLifecycleFailureDetails(null);
  }

  function handleToggleAllVisibleSelection(selectAll: boolean) {
    setSelectedInvoiceIds((previous) =>
      toggleGroupBulkSelection(previous, visibleInvoices, selectAll),
    );
    setBatchSendMessage(null);
    setBatchSendFailureDetails(null);
    setLifecycleMessage(null);
    setLifecycleFailureDetails(null);
  }

  function handleClearSelection() {
    setSelectedInvoiceIds(new Set());
    setBatchSendMessage(null);
    setBatchSendFailureDetails(null);
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
          "We couldn't update the selected invoices.",
        ),
      );
      return;
    }

    setSelectedInvoiceIds((previous) =>
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
      formatBulkInvoicesResultMessage({
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
    const ids = [...selectedInvoiceIds];
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

    const invoiceIds = [...selectedInvoiceIds];
    setBatchSendMessage(null);
    setBatchSendFailureDetails(null);

    startBatchSendTransition(async () => {
      const result = await batchSendInvoicesAction(invoiceIds);

      if (result.error && result.results.length === 0) {
        setBatchSendTone("error");
        setBatchSendMessage(
          formatActionError(result.error, "We couldn't send the selected invoices."),
        );
        return;
      }

      const failedIds = new Set(
        result.results.filter((item) => !item.success).map((item) => item.invoiceId),
      );
      const successfulInvoices = result.results
        .filter((item) => item.success && item.invoice)
        .map((item) => item.invoice!);

      if (successfulInvoices.length > 0) {
        const sentById = new Map(
          successfulInvoices.map((invoice) => [invoice.id, invoice]),
        );

        setInvoices((previous) =>
          previous.map((invoice) => sentById.get(invoice.id) ?? invoice),
        );
      }

      setSelectedInvoiceIds((previous) => {
        if (failedIds.size === 0) {
          return new Set();
        }

        const next = new Set<string>();
        for (const invoiceId of previous) {
          if (failedIds.has(invoiceId)) {
            next.add(invoiceId);
          }
        }
        return next;
      });

      const failureDetails = result.results
        .filter((item) => !item.success)
        .map((item) => `${item.invoiceNumber}: ${item.error ?? "Could not be sent."}`);

      setBatchSendFailureDetails(failureDetails.length > 0 ? failureDetails : null);
      setBatchSendTone(
        result.successCount > 0
          ? result.failureCount > 0
            ? "warning"
            : "success"
          : "error",
      );
      setBatchSendMessage(
        formatBatchSendInvoicesResultMessage({
          successCount: result.successCount,
          failureCount: result.failureCount,
        }),
      );

      if (result.successCount > 0) {
        router.refresh();
      }
    });
  }

  function handleSelectInvoice(invoice: Invoice) {
    router.push(`/invoices/${invoice.id}`);
  }

  function handleNewInvoice() {
    if (!canManageInvoices) {
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

  function handleCreateSubmit(data: InvoiceFormData) {
    if (isPending) {
      return;
    }

    setCreateError(null);

    startTransition(async () => {
      const result = await createInvoiceAction(data);

      if (result.error || !result.invoice) {
        setCreateError(
          formatActionError(
            result.error,
            "We couldn't create this invoice. Check the customer and line items, then try again.",
          ),
        );
        return;
      }

      setInvoices((previous) => [result.invoice!, ...previous]);
      setPanelMode("empty");
      router.push(`/invoices/${result.invoice.id}`);
    });
  }

  const hasNoInvoices = invoices.length === 0;
  const hasNoTodayInvoices = !hasNoInvoices && todayInvoices.length === 0;
  const hasNoResults = !hasNoInvoices && filteredInvoices.length === 0;
  const isCreateOpen = panelMode === "create";

  const subtitle =
    viewTab === "today"
      ? `${activeTodayCount} need attention today`
      : (invoicePageFocus?.sectionDescription ??
        "Track billing, payments, and outstanding balances");

  const highlightedSummaryLabels = invoicePageFocus?.highlightedSummaryLabels
    ?.map((label) => CASH_FLOW_HIGHLIGHT_MAP[label])
    .filter(
      (
        label,
      ): label is
        | "Needs attention"
        | "Overdue"
        | "Due today"
        | "Unpaid total"
        | "Paid this month" => Boolean(label),
    );

  return (
    <MasterListPageLayout
      title="Invoices"
      subtitle={subtitle}
      eyebrow={invoicePageFocus?.sectionEyebrow ?? undefined}
      density="compact"
      banners={
        initialJobId && initialJobLabel ||
        invoicePageFocus?.banner ||
        lifecycleMessage ||
        batchSendMessage
          ? (
              <>
                {initialJobId && initialJobLabel ? (
                  <JobContextFilterBanner
                    jobLabel={initialJobLabel}
                    clearHref={invoicePageFocus?.jobClearHref ?? "/invoices"}
                    variant={initialCreateMode ? "create" : "filter"}
                  />
                ) : null}
                {invoicePageFocus?.banner ? (
                  <InvoiceCashFlowFocusBanner
                    title={invoicePageFocus.banner.title}
                    description={invoicePageFocus.banner.description}
                    clearHref={invoicePageFocus.banner.clearHref}
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
            )
          : undefined
      }
      summary={
        !hasNoInvoices ? (
          <InvoiceSummaryCards
            invoices={activeInvoices}
            highlightedLabels={highlightedSummaryLabels}
          />
        ) : null
      }
      primaryAction={
        canManageInvoices ? (
          <button
            type="button"
            onClick={handleNewInvoice}
            disabled={customers.length === 0}
            className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-xl admin-btn-primary px-3 py-1.5 text-sm disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Plus className="h-3.5 w-3.5" />
            New Invoice
          </button>
        ) : undefined
      }
      className={
        isCreateOpen
          ? "max-lg:h-[calc(100dvh-7rem)] max-lg:min-h-0 max-lg:overflow-hidden"
          : undefined
      }
    >
      <MasterPageSurface
        variant="card"
        className={`flex min-h-[16rem] min-w-0 lg:min-h-0 lg:flex-1 flex-col ${
          isCreateOpen ? "max-lg:hidden" : ""
        }`}
      >
        {!hasNoInvoices ? (
          <div className="shrink-0 border-b border-slate-100/90 px-3 py-1.5 sm:px-4">
            <JobsViewTabs
              activeTab={viewTab}
              onTabChange={setViewTab}
              todayCount={activeTodayCount}
              allCount={activeInvoices.length}
              allTabLabel="All"
            />
          </div>
        ) : null}

        {!hasNoInvoices ? (
          <InvoiceSearchFilterBar
            search={search}
            statusFilter={statusFilter}
            onSearchChange={setSearch}
            onStatusFilterChange={setStatusFilter}
            resultCount={filteredInvoices.length}
            showStatusFilter={viewTab === "all"}
            lifecycleFilter={lifecycleFilter}
            onLifecycleFilterChange={setLifecycleFilter}
            showLifecycleFilter={canManageInvoices}
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

        <div className="min-h-0 min-w-0 flex-1 overflow-x-hidden lg:overflow-y-auto">
          {hasNoInvoices ? (
            <InvoicesEmptyState
              variant="no-invoices"
              needsCustomers={canManageInvoices && customers.length === 0}
              onCreateInvoice={
                canManageInvoices && customers.length > 0
                  ? handleNewInvoice
                  : undefined
              }
            />
          ) : viewTab === "today" && hasNoTodayInvoices ? (
            <InvoicesEmptyState variant="no-today" />
          ) : hasNoResults ? (
            <InvoicesEmptyState variant="no-results" />
          ) : (
            <InvoicesTable
              sections={invoiceListPresentation.sections}
              showSectionHeaders={invoiceListPresentation.showSectionHeaders}
              onSelect={handleSelectInvoice}
              canManageCustomers={canManageCustomers}
              selectionEnabled={selectionEnabled}
              selectedIds={selectedInvoiceIds}
              onToggleSelection={handleToggleInvoiceSelection}
              onToggleAllVisible={handleToggleAllVisibleSelection}
            />
          )}

          {selectionEnabled && lifecycleFilter === "active" ? (
            <InvoiceBatchSelectionBar
              selectedCount={selectedCount}
              sendableCount={selectedSendableCount}
              eligibilityHints={activeBulkEligibilityHints}
              isSending={isBatchSending}
              isLifecycleBusy={isInvoiceLifecycleBusy}
              onSendSelected={handleBatchSendSelected}
              onClearSelection={handleClearSelection}
              archiveAction={
                selectedBulkEligibility &&
                selectedBulkEligibility.archiveEligibleCount > 0
                  ? {
                      eligibleCount: selectedBulkEligibility.archiveEligibleCount,
                      isPending: isBulkArchiving,
                      confirmMessage: formatInvoiceBulkActionConfirmMessage(
                        "archive",
                        selectedBulkEligibility,
                      ),
                      onAction: () =>
                        runBulkLifecycle(
                          bulkArchiveInvoicesAction,
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
                      confirmMessage: formatInvoiceBulkActionConfirmMessage(
                        "void",
                        selectedBulkEligibility,
                      ),
                      onAction: () =>
                        runBulkLifecycle(
                          bulkVoidInvoicesAction,
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
                      confirmMessage: formatInvoiceBulkActionConfirmMessage(
                        "moveToTrash",
                        selectedBulkEligibility,
                      ),
                      onAction: () =>
                        runBulkLifecycle(
                          bulkMoveInvoicesToTrashAction,
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
              entityLabel="invoice"
              selectedCount={selectedCount}
              lifecycleFilter={lifecycleFilter}
              eligibilityHints={lifecycleBulkEligibilityHints}
              isArchiving={isBulkArchiving}
              isRestoring={isBulkRestoring}
              isVoiding={isBulkVoiding}
              isMovingToTrash={isBulkMovingToTrash}
              isRestoringFromTrash={isBulkRestoringFromTrash}
              isPermanentlyDeleting={isBulkPermanentlyDeleting}
              showArchive={
                lifecycleFilter === "voided" &&
                (selectedBulkEligibility?.archiveEligibleCount ?? 0) > 0
              }
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
              archiveConfirmMessage={
                selectedBulkEligibility
                  ? formatInvoiceBulkActionConfirmMessage(
                      "archive",
                      selectedBulkEligibility,
                    )
                  : undefined
              }
              restoreConfirmMessage={
                selectedBulkEligibility
                  ? formatInvoiceBulkActionConfirmMessage(
                      "restore",
                      selectedBulkEligibility,
                    )
                  : undefined
              }
              voidConfirmMessage={
                selectedBulkEligibility
                  ? formatInvoiceBulkActionConfirmMessage(
                      "void",
                      selectedBulkEligibility,
                    )
                  : undefined
              }
              moveToTrashConfirmMessage={
                selectedBulkEligibility
                  ? formatInvoiceBulkActionConfirmMessage(
                      "moveToTrash",
                      selectedBulkEligibility,
                    )
                  : undefined
              }
              restoreFromTrashConfirmMessage={
                selectedBulkEligibility
                  ? formatInvoiceBulkActionConfirmMessage(
                      "restoreFromTrash",
                      selectedBulkEligibility,
                    )
                  : undefined
              }
              permanentDeleteConfirmMessage={
                selectedBulkEligibility
                  ? formatInvoiceBulkActionConfirmMessage(
                      "permanentDelete",
                      selectedBulkEligibility,
                    )
                  : undefined
              }
              onArchive={() =>
                runBulkLifecycle(
                  bulkArchiveInvoicesAction,
                  "Archive",
                  startBulkArchiveTransition,
                )
              }
              onRestore={() =>
                runBulkLifecycle(
                  bulkRestoreInvoicesAction,
                  "Restore",
                  startBulkRestoreTransition,
                )
              }
              onVoid={() =>
                runBulkLifecycle(
                  bulkVoidInvoicesAction,
                  "Void",
                  startBulkVoidTransition,
                )
              }
              onMoveToTrash={() =>
                runBulkLifecycle(
                  bulkMoveInvoicesToTrashAction,
                  "Move to Recently Deleted",
                  startBulkMoveToTrashTransition,
                )
              }
              onRestoreFromTrash={() =>
                runBulkLifecycle(
                  bulkRestoreInvoicesFromTrashAction,
                  "Restore from Recently Deleted",
                  startBulkRestoreFromTrashTransition,
                )
              }
              onPermanentDelete={() =>
                runBulkLifecycle(
                  bulkPermanentlyDeleteInvoicesAction,
                  "Permanent delete",
                  startBulkPermanentDeleteTransition,
                )
              }
              onClearSelection={handleClearSelection}
            />
          ) : null}
        </div>
      </MasterPageSurface>

      <InvoiceDetailsPanel
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
      />
    </MasterListPageLayout>
  );
}
