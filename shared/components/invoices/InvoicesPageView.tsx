"use client";

import { useDeferredValue, useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import {
  batchSendInvoicesAction,
  createInvoiceAction,
} from "@/app/actions/invoices";
import { isNorthStarShellEnabled } from "@/lib/beta/north-star-shell";
import {
  bulkArchiveInvoicesAction,
  bulkMoveInvoicesToTrashAction,
  bulkPermanentlyDeleteInvoicesAction,
  bulkRestoreInvoicesAction,
  bulkRestoreInvoicesFromTrashAction,
  bulkVoidInvoicesAction,
} from "@/app/actions/invoices-bulk-lifecycle";
import {
  resolveBulkSelectionState,
  resolveSelectedItems,
  toggleBulkSelection,
  toggleGroupBulkSelection,
  pruneBulkSelection,
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
import { buildInvoicesGlanceStats } from "@/shared/lib/invoices/invoices-glance-stats";
import { buildSalesHubHref } from "@/shared/lib/sales/sales-hub";
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
import { InvoiceBatchSelectionBar } from "./InvoiceBatchSelectionBar";
import { InvoiceDetailsPanel } from "./InvoiceDetailsPanel";
import { InvoiceSearchFilterBar } from "./InvoiceSearchFilterBar";
import { InvoicesEmptyState } from "./InvoicesEmptyState";
import { InvoicesStatStrip } from "./InvoicesStatStrip";
import { InvoicesTable } from "./InvoicesTable";
import {
  filterInvoicesForWorkQueue,
  resolveDefaultInvoiceWorkQueue,
  sortInvoicesForWorkQueue,
  type InvoiceWorkQueue,
} from "./invoice-work-queues";
import type { InvoicePayment } from "@/shared/types/invoice-payment";
import {
  buildInvoiceSearchFields,
  rankAndSortRecords,
} from "@/shared/lib/search";

type PanelMode = "create" | "empty";

type InvoicesPageViewProps = {
  initialInvoices: Invoice[];
  initialPayments: InvoicePayment[];
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
  /**
   * When true, omit MasterListPageLayout — Sales hub hosts page chrome.
   * Stat strip renders above the list inside the panel.
   */
  embedded?: boolean;
  /** Hub registers New Invoice header action against this handler. */
  onRegisterCreateHandler?: (handler: () => void) => void;
};

function filterInvoices(
  invoices: Invoice[],
  search: string,
  statusFilter: InvoiceListStatusFilter,
  lifecycleFilter: InvoiceLifecycleState,
  customersById: Map<string, Customer>,
  jobsById: Map<string, Job>,
  jobIdFilter?: string,
  prioritizeCashFlow = false,
): { items: Invoice[]; matchReasons: Record<string, string> } {
  const scoped = invoices.filter((invoice) => {
    const matchesLifecycle =
      getInvoiceLifecycleState(invoice) === lifecycleFilter;
    const matchesJob = !jobIdFilter || invoice.jobId === jobIdFilter;
    const matchesStatus = matchesInvoiceListStatusFilter(invoice, statusFilter);
    return matchesLifecycle && matchesJob && matchesStatus;
  });

  const query = search.trim();
  if (!query) {
    const items = prioritizeCashFlow
      ? sortInvoicesForCashFlowFocus(scoped)
      : scoped;
    return { items, matchReasons: {} };
  }

  const ranked = rankAndSortRecords(scoped, query, (invoice) => {
    const job = invoice.jobId ? jobsById.get(invoice.jobId) : undefined;
    return buildInvoiceSearchFields(
      invoice,
      customersById.get(invoice.customerId),
      job
        ? [job.serviceAddress, job.city, job.state, job.zip]
            .filter(Boolean)
            .join(", ")
        : undefined,
    );
  });

  const matchReasons: Record<string, string> = {};
  for (const entry of ranked) {
    if (entry.match.reason) {
      matchReasons[entry.record.id] = entry.match.reason;
    }
  }

  const items = ranked.map((entry) => entry.record);
  return {
    items: prioritizeCashFlow ? sortInvoicesForCashFlowFocus(items) : items,
    matchReasons,
  };
}

export function InvoicesPageView({
  initialInvoices,
  initialPayments,
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
  embedded = false,
  onRegisterCreateHandler,
}: InvoicesPageViewProps) {
  const [invoices, setInvoices] = useState(initialInvoices);
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [workQueue, setWorkQueue] = useState<InvoiceWorkQueue>(() =>
    resolveDefaultInvoiceWorkQueue(
      initialStatusFilter,
      invoicePageFocus?.focus ?? null,
    ),
  );
  const [statusFilter, setStatusFilter] = useState<InvoiceListStatusFilter>(
    () => {
      // Deep-link status that maps to a header pill is expressed by the queue;
      // keep secondary filter only for unpaid / past void|cancelled splits.
      const queue = resolveDefaultInvoiceWorkQueue(
        initialStatusFilter,
        invoicePageFocus?.focus ?? null,
      );
      if (
        initialStatusFilter === "unpaid" ||
        ((initialStatusFilter === "void" ||
          initialStatusFilter === "cancelled") &&
          queue === "past")
      ) {
        return initialStatusFilter;
      }
      return "all";
    },
  );
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

  useEffect(() => {
    if (!onRegisterCreateHandler) {
      return;
    }

    onRegisterCreateHandler(() => {
      if (!canManageInvoices || customers.length === 0) {
        return;
      }

      router.refresh();
      setPanelMode("create");
      setCreateError(null);
    });
  }, [
    onRegisterCreateHandler,
    canManageInvoices,
    customers.length,
    router,
  ]);

  useEffect(() => {
    setInvoices(initialInvoices);
  }, [initialInvoices]);

  useEffect(() => {
    setSelectedInvoiceIds(new Set());
    setBatchSendMessage(null);
    setBatchSendFailureDetails(null);
    setLifecycleMessage(null);
    setLifecycleFailureDetails(null);
  }, [lifecycleFilter, workQueue, statusFilter]);

  const prioritizeCashFlow =
    invoicePageFocus?.focus === "cash-flow" ||
    workQueue === "overdue" ||
    statusFilter === "unpaid";

  const glanceStats = useMemo(
    () =>
      buildInvoicesGlanceStats({
        invoices,
        payments: initialPayments,
      }),
    [invoices, initialPayments],
  );

  const queueScopedInvoices = useMemo(() => {
    // Archived / recently deleted / voided lifecycle are reached via the
    // lifecycle filter; status pills only scope the active book.
    if (lifecycleFilter !== "active") {
      return invoices;
    }

    return filterInvoicesForWorkQueue(invoices, workQueue);
  }, [invoices, lifecycleFilter, workQueue]);

  const customersById = useMemo(
    () => new Map(customers.map((customer) => [customer.id, customer])),
    [customers],
  );
  const jobsForSearchById = useMemo(
    () => new Map(jobs.map((job) => [job.id, job])),
    [jobs],
  );

  const filteredInvoiceResult = useMemo(() => {
    // Past pill surfaces voided lifecycle rows while the lifecycle control
    // remains on Active (status pills own the active book; Past is the exception).
    const effectiveLifecycleFilter: InvoiceLifecycleState =
      lifecycleFilter === "active" && workQueue === "past"
        ? "voided"
        : lifecycleFilter;

    return filterInvoices(
      queueScopedInvoices,
      deferredSearch,
      statusFilter,
      effectiveLifecycleFilter,
      customersById,
      jobsForSearchById,
      initialJobId,
      prioritizeCashFlow,
    );
  }, [
    queueScopedInvoices,
    deferredSearch,
    statusFilter,
    lifecycleFilter,
    workQueue,
    customersById,
    jobsForSearchById,
    initialJobId,
    prioritizeCashFlow,
  ]);
  const filteredInvoices = filteredInvoiceResult.items;
  const searchMatchReasons = filteredInvoiceResult.matchReasons;

  const invoiceListPresentation = useMemo(() => {
    const items =
      workQueue === "overdue" || prioritizeCashFlow
        ? sortInvoicesForCashFlowFocus(filteredInvoices)
        : sortInvoicesForWorkQueue(filteredInvoices, workQueue);

    return {
      sections: [
        {
          id: workQueue,
          label: "",
          items,
        },
      ],
      showSectionHeaders: false,
    };
  }, [filteredInvoices, prioritizeCashFlow, workQueue]);

  const jobsById = useMemo(() => buildJobsByIdForBatchSend(jobs), [jobs]);

  const visibleInvoices = useMemo(
    () =>
      invoiceListPresentation.sections.flatMap((section) => section.items),
    [invoiceListPresentation.sections],
  );

  useEffect(() => {
    setSelectedInvoiceIds((previous) => {
      if (previous.size === 0) {
        return previous;
      }

      const visibleIds = new Set(visibleInvoices.map((invoice) => invoice.id));
      const pruned = pruneBulkSelection(previous, visibleIds);

      if (pruned.size === previous.size) {
        return previous;
      }

      return pruned;
    });
  }, [search, visibleInvoices]);

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

  function handleQueueChange(queue: InvoiceWorkQueue) {
    setWorkQueue(queue);
    setStatusFilter("all");
    setBatchSendMessage(null);
    setBatchSendFailureDetails(null);
    setLifecycleMessage(null);
    setLifecycleFailureDetails(null);
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
  const hasNoQueueInvoices =
    !hasNoInvoices && queueScopedInvoices.length === 0;
  const hasNoResults = !hasNoInvoices && filteredInvoices.length === 0;

  const subtitle =
    "Collect money, send invoices, and find past billing records.";

  const northStar = isNorthStarShellEnabled();

  const banners =
    (initialJobId && initialJobLabel) ||
    lifecycleMessage ||
    batchSendMessage ? (
      <>
        {initialJobId && initialJobLabel ? (
          <JobContextFilterBanner
            jobLabel={initialJobLabel}
            clearHref={
              invoicePageFocus?.jobClearHref ?? buildSalesHubHref("invoices")
            }
            variant={initialCreateMode ? "create" : "filter"}
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
        {!hasNoInvoices ? (
          <>
            {embedded ? (
              <div className="border-b border-altair-border/70 px-1 pb-2 sm:px-0">
                <InvoicesStatStrip
                  stats={glanceStats}
                  activeQueue={workQueue}
                  onFilterQueue={handleQueueChange}
                />
              </div>
            ) : null}
            <InvoiceSearchFilterBar
              search={search}
              statusFilter={statusFilter}
              onSearchChange={setSearch}
              onStatusFilterChange={setStatusFilter}
              resultCount={filteredInvoices.length}
              showStatusFilter={workQueue === "past"}
              lifecycleFilter={lifecycleFilter}
              onLifecycleFilterChange={setLifecycleFilter}
              showLifecycleFilter={canManageInvoices}
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
          {hasNoInvoices ? (
            <InvoicesEmptyState
              variant="no-invoices"
              needsCustomers={canManageInvoices && customers.length === 0}
              onCreateInvoice={
                canManageInvoices && customers.length > 0
                  ? handleNewInvoice
                  : undefined
              }
              northStar={northStar}
            />
          ) : hasNoQueueInvoices || hasNoResults ? (
            <InvoicesEmptyState variant="no-results" northStar={northStar} />
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
              northStar={northStar}
              matchReasons={searchMatchReasons}
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
              northStar={northStar}
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
      title="Invoices"
      subtitle={subtitle}
      eyebrow={invoicePageFocus?.sectionEyebrow ?? undefined}
      density="compact"
      headerSurfaceVariant="default"
      headerTitleClassName="min-w-0 text-base font-semibold tracking-tight text-altair-ink-on-paper sm:text-lg"
      headerSubtitleClassName="min-w-0 truncate text-[11px] leading-snug text-altair-ink-on-paper-muted"
      headerClassName="py-1.5"
      headerCenter={
        hasNoInvoices ? undefined : (
          <InvoicesStatStrip
            stats={glanceStats}
            activeQueue={workQueue}
            onFilterQueue={handleQueueChange}
          />
        )
      }
      banners={banners ?? undefined}
      primaryAction={
        canManageInvoices ? (
          <button
            type="button"
            onClick={handleNewInvoice}
            disabled={customers.length === 0}
            className={
              northStar
                ? `north-star-invoices-primary-action ${lt.primaryAction} disabled:cursor-not-allowed disabled:opacity-60`
                : `${masterListPagePrimaryActionClass} disabled:cursor-not-allowed disabled:opacity-60`
            }
          >
            <Plus className="h-3.5 w-3.5" />
            New Invoice
          </button>
        ) : undefined
      }
      className={northStar ? lt.pageCanvas : undefined}
      headerEyebrowClassName={northStar ? lt.pageHeaderEyebrow : undefined}
    >
      {panelBody}
    </MasterListPageLayout>
  );
}
