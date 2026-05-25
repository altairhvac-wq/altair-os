"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { mockInvoices } from "@/shared/data/mock-invoices";
import { formatCurrency } from "@/shared/types/customer";
import {
  calculateInvoiceSubtotal,
  calculateInvoiceTotal,
  formatInvoiceStatus,
  type Invoice,
  type InvoiceFormData,
  type InvoiceStatus,
} from "@/shared/types/invoice";
import { InvoiceDetailsPanel } from "./InvoiceDetailsPanel";
import { InvoiceSearchFilterBar } from "./InvoiceSearchFilterBar";
import { InvoiceSummaryCards } from "./InvoiceSummaryCards";
import { InvoicesEmptyState } from "./InvoicesEmptyState";
import { InvoicesLoadingState } from "./InvoicesLoadingState";
import { InvoicesTable } from "./InvoicesTable";

type PanelMode = "detail" | "create" | "empty";

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
      invoice.jobType,
      formatCurrency(invoice.total),
      String(invoice.total),
    ]
      .join(" ")
      .toLowerCase();

    return haystack.includes(query);
  });
}

function formDataToInvoice(data: InvoiceFormData, existingCount: number): Invoice {
  const subtotal = calculateInvoiceSubtotal(data.lineItems);
  const total = calculateInvoiceTotal(data.lineItems, data.tax);
  const invoiceNumber = `INV-${1060 + existingCount}`;
  const today = new Date().toISOString().split("T")[0];

  return {
    id: `inv-${Date.now()}`,
    invoiceNumber,
    customerId: `cust-new-${Date.now()}`,
    customerName: data.customerName,
    jobType: data.jobType,
    status: data.status,
    lineItems: data.lineItems.map((item, index) => ({
      id: `ili-${Date.now()}-${index}`,
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
    })),
    subtotal,
    tax: data.tax > 0 ? data.tax : undefined,
    total,
    amountPaid: 0,
    balanceDue: total,
    issuedAt: today,
    dueDate: data.dueDate,
    notes: data.notes || undefined,
    createdAt: today,
  };
}

export function InvoicesPageView() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | "all">("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [panelMode, setPanelMode] = useState<PanelMode>("empty");

  useEffect(() => {
    const timer = setTimeout(() => {
      setInvoices(mockInvoices);
      setIsLoading(false);
    }, 600);

    return () => clearTimeout(timer);
  }, []);

  const filteredInvoices = useMemo(
    () => filterInvoices(invoices, search, statusFilter),
    [invoices, search, statusFilter],
  );

  const selectedInvoice = invoices.find((inv) => inv.id === selectedId) ?? null;

  function handleSelectInvoice(invoice: Invoice) {
    setSelectedId(invoice.id);
    setPanelMode("detail");
  }

  function handleNewInvoice() {
    setSelectedId(null);
    setPanelMode("create");
  }

  function handleClosePanel() {
    setSelectedId(null);
    setPanelMode("empty");
  }

  function handleCreateSubmit(data: InvoiceFormData) {
    const newInvoice = formDataToInvoice(data, invoices.length);
    setInvoices((prev) => [newInvoice, ...prev]);
    setSelectedId(newInvoice.id);
    setPanelMode("detail");
  }

  if (isLoading) {
    return <InvoicesLoadingState />;
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
            <button
              type="button"
              onClick={handleNewInvoice}
              className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-cyan-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-cyan-700"
            >
              <Plus className="h-4 w-4" />
              New Invoice
            </button>
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
                onCreateInvoice={handleNewInvoice}
              />
            ) : hasNoResults ? (
              <InvoicesEmptyState variant="no-results" />
            ) : (
              <InvoicesTable
                invoices={filteredInvoices}
                selectedId={selectedId}
                onSelect={handleSelectInvoice}
              />
            )}
          </div>
        </section>

        <InvoiceDetailsPanel
          mode={panelMode}
          invoice={selectedInvoice}
          onClose={handleClosePanel}
          onCreateSubmit={handleCreateSubmit}
          onCreateCancel={handleClosePanel}
        />
      </div>
    </div>
  );
}
