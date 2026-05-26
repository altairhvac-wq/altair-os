"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { createEstimateAction } from "@/app/actions/estimates";
import type { Customer } from "@/shared/types/customer";
import type { Job } from "@/shared/types/job";
import type { ServiceItem } from "@/shared/types/service-item";
import {
  type Estimate,
  type EstimateFormData,
  type EstimateStatus,
} from "@/shared/types/estimate";
import { listDetailListSectionClassName } from "@/shared/components/layout/list-detail-layout";
import { EstimateDetailsPanel } from "./EstimateDetailsPanel";
import { EstimateSearchFilterBar } from "./EstimateSearchFilterBar";
import { EstimatesEmptyState } from "./EstimatesEmptyState";
import { EstimatesTable } from "./EstimatesTable";
import { formatEstimateStatus } from "@/shared/types/estimate";
import { formatCurrency } from "@/shared/types/customer";

type PanelMode = "create" | "empty";

type EstimatesPageViewProps = {
  initialEstimates: Estimate[];
  customers: Customer[];
  jobs: Job[];
  serviceItems: ServiceItem[];
  canManageEstimates: boolean;
  initialPanelMode?: PanelMode;
  createInitialData?: Partial<EstimateFormData>;
};

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

export function EstimatesPageView({
  initialEstimates,
  customers,
  jobs,
  serviceItems,
  canManageEstimates,
  initialPanelMode = "empty",
  createInitialData,
}: EstimatesPageViewProps) {
  const [estimates, setEstimates] = useState(initialEstimates);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<EstimateStatus | "all">(
    "all",
  );
  const [panelMode, setPanelMode] = useState<PanelMode>(initialPanelMode);
  const [createError, setCreateError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const filteredEstimates = useMemo(
    () => filterEstimates(estimates, search, statusFilter),
    [estimates, search, statusFilter],
  );

  function handleSelectEstimate(estimate: Estimate) {
    router.push(`/estimates/${estimate.id}`);
  }

  function handleNewEstimate() {
    if (!canManageEstimates) {
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

  function handleCreateSubmit(data: EstimateFormData) {
    setCreateError(null);

    startTransition(async () => {
      const result = await createEstimateAction(data);

      if (result.error || !result.estimate) {
        setCreateError(result.error ?? "Failed to create estimate.");
        return;
      }

      setEstimates((previous) => [result.estimate!, ...previous]);
      setPanelMode("empty");
      router.push(`/estimates/${result.estimate.id}`);
    });
  }

  const hasNoEstimates = estimates.length === 0;
  const hasNoResults = !hasNoEstimates && filteredEstimates.length === 0;

  return (
    <div className="flex flex-col gap-4 lg:h-[calc(100dvh-7rem)] lg:flex-row lg:overflow-hidden">
      <section className={`${listDetailListSectionClassName} flex min-h-[16rem] min-w-0 flex-[1_1_55%] flex-col lg:overflow-hidden admin-card lg:min-h-0 lg:flex-1`}>
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">All estimates</h2>
            <p className="text-xs text-slate-500">
              Create quotes, track approvals, and convert to jobs
            </p>
          </div>
          {canManageEstimates ? (
            <button
              type="button"
              onClick={handleNewEstimate}
              disabled={customers.length === 0}
              className="inline-flex shrink-0 items-center gap-2 admin-btn-primary disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Plus className="h-4 w-4" />
              New Estimate
            </button>
          ) : null}
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

        <div className="min-h-0 flex-1 lg:overflow-y-auto">
          {hasNoEstimates ? (
            <EstimatesEmptyState
              variant="no-estimates"
              onCreateEstimate={
                canManageEstimates && customers.length > 0
                  ? handleNewEstimate
                  : undefined
              }
            />
          ) : hasNoResults ? (
            <EstimatesEmptyState variant="no-results" />
          ) : (
            <EstimatesTable
              estimates={filteredEstimates}
              onSelect={handleSelectEstimate}
            />
          )}
        </div>
      </section>

      <EstimateDetailsPanel
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
  );
}
