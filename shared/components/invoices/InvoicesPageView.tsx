"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { createInvoiceAction } from "@/app/actions/invoices";
import type { Customer } from "@/shared/types/customer";
import type { Job } from "@/shared/types/job";
import type { ServiceItem } from "@/shared/types/service-item";
import {
  formatInvoiceStatus,
  type Invoice,
  type InvoiceFormData,
  type InvoiceStatus,
} from "@/shared/types/invoice";
import { formatCurrency } from "@/shared/types/customer";
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
};

function filterInvoices(
  invoices: Invoice[],
  search: string,
  statusFilter: InvoiceStatus | "all",
): Invoice[] {
  const query = search.trim().toLowerCase();

  return invoices.filter((invoice) => {
    const matchesStatus =
      statusFilter === "all" || invoice.status === statusFilter;

    if (!matchesStatus) return false;
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
}

export function InvoicesPageView({
  initialInvoices,
  customers,
  jobs,
  serviceItems,
  canManageInvoices,
  initialPanelMode = "empty",
  createInitialData,
}: InvoicesPageViewProps) {
  const [invoices, setInvoices] = useState(initialInvoices);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | "all">(
    "all",
  );
  const [panelMode, setPanelMode] = useState<PanelMode>(initialPanelMode);
  const [createError, setCreateError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const filteredInvoices = useMemo(
    () => filterInvoices(invoices, search, statusFilter),
    [invoices, search, statusFilter],
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
    setCreateError(null);

    startTransition(async () => {
      const result = await createInvoiceAction(data);

      if (result.error || !result.invoice) {
        setCreateError(result.error ?? "Failed to create invoice.");
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
    <div className="flex h-[calc(100vh-7rem)] flex-col gap-4 overflow-hidden">
      <InvoiceSummaryCards invoices={invoices} />

      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden lg:flex-row">
        <section className="flex min-h-[16rem] min-w-0 flex-[1_1_55%] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm lg:min-h-0 lg:flex-1">
          <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">All invoices</h2>
              <p className="text-xs text-slate-500">
                Track billing, payments, and outstanding balances
              </p>
            </div>
            {canManageInvoices ? (
              <button
                type="button"
                onClick={handleNewInvoice}
                disabled={customers.length === 0}
                className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-cyan-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-cyan-700 disabled:cursor-not-allowed disabled:opacity-60"
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

          <div className="min-h-0 flex-1 overflow-y-auto">
            {hasNoInvoices ? (
              <InvoicesEmptyState
                variant="no-invoices"
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
