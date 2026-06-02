"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import {
  batchSendInvoicesAction,
  createInvoiceAction,
} from "@/app/actions/invoices";
import { useCompanyTimezone } from "@/shared/lib/company-timezone";
import {
  buildJobsByIdForBatchSend,
  formatBatchSendInvoicesResultMessage,
  resolveInvoiceBatchSelectionState,
  toggleInvoiceBatchSelection,
  toggleInvoiceGroupBatchSelection,
} from "@/shared/lib/invoice-batch-send";
import { formatActionError } from "@/shared/lib/operational-errors";
import type { Customer } from "@/shared/types/customer";
import type { Job } from "@/shared/types/job";
import type { ServiceItem } from "@/shared/types/service-item";
import {
  formatInvoiceStatus,
  type Invoice,
  type InvoiceFormData,
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
import { ListCommandCenterLayout } from "@/shared/components/layout/ListCommandCenterLayout";
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
  jobIdFilter?: string,
  prioritizeCashFlow = false,
): Invoice[] {
  const query = search.trim().toLowerCase();

  const filtered = invoices.filter((invoice) => {
    const matchesJob = !jobIdFilter || invoice.jobId === jobIdFilter;
    const matchesStatus = matchesInvoiceListStatusFilter(invoice, statusFilter);

    if (!matchesJob || !matchesStatus) return false;
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
  const [isPending, startTransition] = useTransition();
  const [isBatchSending, startBatchSendTransition] = useTransition();
  const router = useRouter();
  const companyTimeZone = useCompanyTimezone();

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
        initialJobId,
        prioritizeCashFlow,
      ),
    [
      viewScopedInvoices,
      search,
      statusFilter,
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
        ? resolveInvoiceBatchSelectionState(
            selectedInvoiceIds,
            visibleInvoices,
            jobsById,
          )
        : null,
    [jobsById, selectedInvoiceIds, selectionEnabled, visibleInvoices],
  );

  function handleToggleInvoiceSelection(invoiceId: string) {
    setSelectedInvoiceIds((previous) =>
      toggleInvoiceBatchSelection(previous, invoiceId),
    );
    setBatchSendMessage(null);
    setBatchSendFailureDetails(null);
  }

  function handleToggleAllVisibleSelection(selectAll: boolean) {
    setSelectedInvoiceIds((previous) =>
      toggleInvoiceGroupBatchSelection(
        previous,
        visibleInvoices,
        selectAll,
        jobsById,
      ),
    );
    setBatchSendMessage(null);
    setBatchSendFailureDetails(null);
  }

  function handleClearSelection() {
    setSelectedInvoiceIds(new Set());
    setBatchSendMessage(null);
    setBatchSendFailureDetails(null);
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

  const subtitle =
    viewTab === "today"
      ? `${todayInvoices.length} need attention today`
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
    <ListCommandCenterLayout
      title="Invoices"
      subtitle={subtitle}
      eyebrow={invoicePageFocus?.sectionEyebrow ?? undefined}
      banners={
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
        </>
      }
      summary={
        !hasNoInvoices ? (
          <InvoiceSummaryCards
            invoices={invoices}
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
            className="inline-flex shrink-0 items-center gap-2 admin-btn-primary disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Plus className="h-4 w-4" />
            New Invoice
          </button>
        ) : undefined
      }
    >
      <section className="flex min-h-[16rem] min-w-0 lg:flex-1 flex-col overflow-hidden admin-card lg:min-h-0">
        {!hasNoInvoices ? (
          <div className="shrink-0 border-b border-slate-100/90 px-4 py-2.5">
            <JobsViewTabs
              activeTab={viewTab}
              onTabChange={setViewTab}
              todayCount={todayInvoices.length}
              allCount={invoices.length}
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
              selectionEnabled={selectionEnabled}
              selectedIds={selectedInvoiceIds}
              jobsById={jobsById}
              onToggleSelection={handleToggleInvoiceSelection}
              onToggleAllVisible={handleToggleAllVisibleSelection}
            />
          )}

          {selectionEnabled ? (
            <InvoiceBatchSelectionBar
              selectedCount={selectedCount}
              isSending={isBatchSending}
              onSendSelected={handleBatchSendSelected}
              onClearSelection={handleClearSelection}
            />
          ) : null}
        </div>
      </section>

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
    </ListCommandCenterLayout>
  );
}
