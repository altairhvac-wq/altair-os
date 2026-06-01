"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { createEstimateAction } from "@/app/actions/estimates";
import { useCompanyTimezone } from "@/shared/lib/company-timezone";
import { formatActionError } from "@/shared/lib/operational-errors";
import type { Customer } from "@/shared/types/customer";
import type { Job } from "@/shared/types/job";
import type { ServiceItem } from "@/shared/types/service-item";
import {
  type Estimate,
  type EstimateFormData,
  type EstimateStatus,
} from "@/shared/types/estimate";
import { ListCommandCenterLayout } from "@/shared/components/layout/ListCommandCenterLayout";
import { JobsViewTabs, type TodayAllViewTab } from "@/shared/components/jobs/JobsViewTabs";
import { EstimateDetailsPanel } from "./EstimateDetailsPanel";
import { EstimateSearchFilterBar } from "./EstimateSearchFilterBar";
import { EstimateSummaryCards } from "./EstimateSummaryCards";
import { EstimatesEmptyState } from "./EstimatesEmptyState";
import { EstimatesTable } from "./EstimatesTable";
import {
  filterEstimatesForTodayView,
  prepareEstimatesForListView,
  prepareEstimatesForTodayView,
} from "@/shared/lib/estimate-workflow-list";
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
  aiFeaturesEnabled?: boolean;
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
  aiFeaturesEnabled = false,
}: EstimatesPageViewProps) {
  const [estimates, setEstimates] = useState(initialEstimates);
  const [search, setSearch] = useState("");
  const [viewTab, setViewTab] = useState<TodayAllViewTab>("today");
  const [statusFilter, setStatusFilter] = useState<EstimateStatus | "all">(
    "all",
  );
  const [panelMode, setPanelMode] = useState<PanelMode>(initialPanelMode);
  const [createError, setCreateError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const companyTimeZone = useCompanyTimezone();

  const jobsById = useMemo(
    () => new Map(jobs.map((job) => [job.id, job])),
    [jobs],
  );

  const todayContext = useMemo(
    () => ({
      timeZone: companyTimeZone,
      jobsById,
    }),
    [companyTimeZone, jobsById],
  );

  const todayEstimates = useMemo(
    () => filterEstimatesForTodayView(estimates, todayContext),
    [estimates, todayContext],
  );

  const viewScopedEstimates = useMemo(
    () => (viewTab === "today" ? todayEstimates : estimates),
    [estimates, todayEstimates, viewTab],
  );

  const filteredEstimates = useMemo(
    () => filterEstimates(viewScopedEstimates, search, statusFilter),
    [viewScopedEstimates, search, statusFilter],
  );

  const estimateListPresentation = useMemo(() => {
    if (viewTab === "today") {
      return prepareEstimatesForTodayView(filteredEstimates);
    }

    return prepareEstimatesForListView(filteredEstimates, statusFilter);
  }, [filteredEstimates, statusFilter, viewTab]);

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
    if (isPending) {
      return;
    }

    setCreateError(null);

    startTransition(async () => {
      const result = await createEstimateAction(data);

      if (result.error || !result.estimate) {
        setCreateError(
          formatActionError(
            result.error,
            "We couldn't create this estimate. Check the customer and line items, then try again.",
          ),
        );
        return;
      }

      setEstimates((previous) => [result.estimate!, ...previous]);
      setPanelMode("empty");
      router.push(`/estimates/${result.estimate.id}`);
    });
  }

  const hasNoEstimates = estimates.length === 0;
  const hasNoTodayEstimates = !hasNoEstimates && todayEstimates.length === 0;
  const hasNoResults = !hasNoEstimates && filteredEstimates.length === 0;

  const subtitle =
    viewTab === "today"
      ? `${todayEstimates.length} need attention today`
      : "Create quotes, track approvals, and convert to jobs";

  return (
    <ListCommandCenterLayout
      title="Estimates"
      subtitle={subtitle}
      summary={
        !hasNoEstimates ? <EstimateSummaryCards estimates={estimates} /> : null
      }
      primaryAction={
        canManageEstimates ? (
          <button
            type="button"
            onClick={handleNewEstimate}
            disabled={customers.length === 0}
            className="inline-flex shrink-0 items-center gap-2 admin-btn-primary disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Plus className="h-4 w-4" />
            New Estimate
          </button>
        ) : undefined
      }
    >
      <section className="flex min-h-[16rem] min-w-0 flex-1 flex-col overflow-hidden admin-card lg:min-h-0">
        {!hasNoEstimates ? (
          <div className="shrink-0 border-b border-slate-100/90 px-4 py-2.5">
            <JobsViewTabs
              activeTab={viewTab}
              onTabChange={setViewTab}
              todayCount={todayEstimates.length}
              allCount={estimates.length}
              allTabLabel="All"
            />
          </div>
        ) : null}

        {!hasNoEstimates ? (
          <EstimateSearchFilterBar
            search={search}
            statusFilter={statusFilter}
            onSearchChange={setSearch}
            onStatusFilterChange={setStatusFilter}
            resultCount={filteredEstimates.length}
            showStatusFilter={viewTab === "all"}
          />
        ) : null}

        <div className="min-h-0 min-w-0 flex-1 overflow-x-hidden lg:overflow-y-auto">
          {hasNoEstimates ? (
            <EstimatesEmptyState
              variant="no-estimates"
              needsCustomers={canManageEstimates && customers.length === 0}
              onCreateEstimate={
                canManageEstimates && customers.length > 0
                  ? handleNewEstimate
                  : undefined
              }
            />
          ) : viewTab === "today" && hasNoTodayEstimates ? (
            <EstimatesEmptyState variant="no-today" />
          ) : hasNoResults ? (
            <EstimatesEmptyState variant="no-results" />
          ) : (
            <EstimatesTable
              sections={estimateListPresentation.sections}
              showSectionHeaders={estimateListPresentation.showSectionHeaders}
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
        aiFeaturesEnabled={aiFeaturesEnabled}
        canDraftDescription={canManageEstimates}
      />
    </ListCommandCenterLayout>
  );
}
