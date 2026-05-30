"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { createInvoiceAction } from "@/app/actions/invoices";
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
import { formatCurrency } from "@/shared/types/customer";
import { listDetailListSectionClassName } from "@/shared/components/layout/list-detail-layout";
import { JobContextFilterBanner } from "@/shared/components/layout/JobContextFilterBanner";
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
  const [statusFilter, setStatusFilter] =
    useState<InvoiceListStatusFilter>(initialStatusFilter);
  const [panelMode, setPanelMode] = useState<PanelMode>(initialPanelMode);
  const [createError, setCreateError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const prioritizeCashFlow = invoicePageFocus?.focus === "cash-flow";

  const filteredInvoices = useMemo(
    () =>
      filterInvoices(
        invoices,
        search,
        statusFilter,
        initialJobId,
        prioritizeCashFlow,
      ),
    [invoices, search, statusFilter, initialJobId, prioritizeCashFlow],
  );

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
  const hasNoResults = !hasNoInvoices && filteredInvoices.length === 0;

  return (
    <div className="flex flex-col gap-4 lg:h-[calc(100dvh-7rem)] lg:overflow-hidden">
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

      <InvoiceSummaryCards
        invoices={invoices}
        highlightedLabels={invoicePageFocus?.highlightedSummaryLabels}
      />

      <div className="flex min-h-0 flex-1 flex-col gap-4 lg:flex-row lg:overflow-hidden">
        <section className={`${listDetailListSectionClassName} flex min-h-[16rem] min-w-0 flex-[1_1_55%] flex-col lg:overflow-hidden admin-card lg:min-h-0 lg:flex-1`}>
          <div className="admin-panel-header admin-section-header flex shrink-0 flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              {invoicePageFocus?.sectionEyebrow ? (
                <p className="text-[10px] font-bold uppercase tracking-widest text-amber-700">
                  {invoicePageFocus.sectionEyebrow}
                </p>
              ) : null}
              <h2 className="admin-heading-section sm:text-base">All invoices</h2>
              <p className="admin-text-helper mt-0.5">
                {invoicePageFocus?.sectionDescription ??
                  "Track billing, payments, and outstanding balances"}
              </p>
            </div>
            {canManageInvoices ? (
              <button
                type="button"
                onClick={handleNewInvoice}
                disabled={customers.length === 0}
                className="inline-flex shrink-0 items-center gap-2 admin-btn-primary disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Plus className="h-4 w-4" />
                New Invoice
              </button>
            ) : null}
          </div>

          {!hasNoInvoices ? (
            <div className="shrink-0">
              <InvoiceSearchFilterBar
                search={search}
                statusFilter={statusFilter}
                onSearchChange={setSearch}
                onStatusFilterChange={setStatusFilter}
                resultCount={filteredInvoices.length}
              />
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
            ) : hasNoResults ? (
              <InvoicesEmptyState variant="no-results" />
            ) : (
              <InvoicesTable
                invoices={filteredInvoices}
                onSelect={handleSelectInvoice}
              />
            )}
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
      </div>
    </div>
  );
}
