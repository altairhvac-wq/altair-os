"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { mockEstimates } from "@/shared/data/mock-estimates";
import { formatCurrency } from "@/shared/types/customer";
import {
  calculateEstimateSubtotal,
  formatEstimateStatus,
  type Estimate,
  type EstimateFormData,
  type EstimateStatus,
} from "@/shared/types/estimate";
import { EstimateDetailsPanel } from "./EstimateDetailsPanel";
import { EstimateSearchFilterBar } from "./EstimateSearchFilterBar";
import { EstimatesEmptyState } from "./EstimatesEmptyState";
import { EstimatesLoadingState } from "./EstimatesLoadingState";
import { EstimatesTable } from "./EstimatesTable";

type PanelMode = "detail" | "create" | "empty";

function filterEstimates(
  estimates: Estimate[],
  search: string,
  statusFilter: EstimateStatus | "all",
): Estimate[] {
  const query = search.trim().toLowerCase();

  return estimates.filter((estimate) => {
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

function formDataToEstimate(data: EstimateFormData, existingCount: number): Estimate {
  const subtotal = calculateEstimateSubtotal(data.lineItems);
  const estimateNumber = `EST-${1050 + existingCount}`;

  return {
    id: `est-${Date.now()}`,
    estimateNumber,
    customerId: `cust-new-${Date.now()}`,
    customerName: data.customerName,
    status: data.status,
    lineItems: data.lineItems.map((item, index) => ({
      id: `li-${Date.now()}-${index}`,
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
    })),
    subtotal,
    total: subtotal,
    validUntil: data.validUntil || undefined,
    notes: data.notes || undefined,
    createdAt: new Date().toISOString().split("T")[0],
  };
}

export function EstimatesPageView() {
  const [estimates, setEstimates] = useState<Estimate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<EstimateStatus | "all">("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [panelMode, setPanelMode] = useState<PanelMode>("empty");

  useEffect(() => {
    const timer = setTimeout(() => {
      setEstimates(mockEstimates);
      setIsLoading(false);
    }, 600);

    return () => clearTimeout(timer);
  }, []);

  const filteredEstimates = useMemo(
    () => filterEstimates(estimates, search, statusFilter),
    [estimates, search, statusFilter],
  );

  const selectedEstimate = estimates.find((e) => e.id === selectedId) ?? null;

  function handleSelectEstimate(estimate: Estimate) {
    setSelectedId(estimate.id);
    setPanelMode("detail");
  }

  function handleNewEstimate() {
    setSelectedId(null);
    setPanelMode("create");
  }

  function handleClosePanel() {
    setSelectedId(null);
    setPanelMode("empty");
  }

  function handleCreateSubmit(data: EstimateFormData) {
    const newEstimate = formDataToEstimate(data, estimates.length);
    setEstimates((prev) => [newEstimate, ...prev]);
    setSelectedId(newEstimate.id);
    setPanelMode("detail");
  }

  if (isLoading) {
    return <EstimatesLoadingState />;
  }

  const hasNoEstimates = estimates.length === 0;
  const hasNoResults = !hasNoEstimates && filteredEstimates.length === 0;

  return (
    <div className="flex h-[calc(100vh-7rem)] flex-col gap-4 overflow-hidden lg:flex-row">
      <section className="flex min-h-[16rem] min-w-0 flex-[1_1_55%] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm lg:min-h-0 lg:flex-1">
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">All estimates</h2>
            <p className="text-xs text-slate-500">
              Create quotes, track approvals, and convert to jobs
            </p>
          </div>
          <button
            type="button"
            onClick={handleNewEstimate}
            className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-cyan-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-cyan-700"
          >
            <Plus className="h-4 w-4" />
            New Estimate
          </button>
        </div>

        {!hasNoEstimates ? (
          <div className="shrink-0">
            <EstimateSearchFilterBar
              search={search}
              statusFilter={statusFilter}
              onSearchChange={setSearch}
              onStatusFilterChange={setStatusFilter}
              resultCount={filteredEstimates.length}
            />
          </div>
        ) : null}

        <div className="min-h-0 flex-1 overflow-y-auto">
          {hasNoEstimates ? (
            <EstimatesEmptyState
              variant="no-estimates"
              onCreateEstimate={handleNewEstimate}
            />
          ) : hasNoResults ? (
            <EstimatesEmptyState variant="no-results" />
          ) : (
            <EstimatesTable
              estimates={filteredEstimates}
              selectedId={selectedId}
              onSelect={handleSelectEstimate}
            />
          )}
        </div>
      </section>

      <EstimateDetailsPanel
        mode={panelMode}
        estimate={selectedEstimate}
        onClose={handleClosePanel}
        onCreateSubmit={handleCreateSubmit}
        onCreateCancel={handleClosePanel}
      />
    </div>
  );
}
