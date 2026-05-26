"use client";

import { useEffect, useMemo, useState } from "react";
import { UserPlus } from "lucide-react";
import { mockNetworkPartners } from "@/shared/data/mock-network-partners";
import { mockSubcontractJobs } from "@/shared/data/mock-subcontract-jobs";
import {
  filterPartners,
  filterSubcontractJobs,
  formDataToPartner,
  getNetworkRevenueSummary,
} from "@/shared/types/network-utils";
import {
  getNetworkTabDescription,
  NetworkPageHeader,
} from "./NetworkPageHeader";
import {
  NETWORK_TAB_OPTIONS,
  type NetworkTab,
  type PartnerCompany,
  type PartnerFormData,
  type RelationshipStatus,
  type SubcontractJob,
  type SubcontractJobStatus,
  type TradeType,
} from "@/shared/types/network";
import { listDetailListSectionClassName } from "@/shared/components/layout/list-detail-layout";
import { MyNetworkContent } from "./MyNetworkContent";
import { NetworkEmptyState } from "./NetworkEmptyState";
import { NetworkLoadingState } from "./NetworkLoadingState";
import { NetworkSearchFilterBar } from "./NetworkSearchFilterBar";
import { PartnerDetailsPanel } from "./PartnerDetailsPanel";
import { PartnerRevenueStats } from "./PartnerRevenueStats";
import { SubcontractJobDetailsPanel } from "./SubcontractJobDetailsPanel";
import { SubcontractJobsTable } from "./SubcontractJobsTable";

type PartnerPanelMode = "detail" | "create" | "empty";

export function NetworkPageView() {
  const [partners, setPartners] = useState<PartnerCompany[]>([]);
  const [jobs, setJobs] = useState<SubcontractJob[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<NetworkTab>("my-network");
  const [search, setSearch] = useState("");
  const [tradeFilter, setTradeFilter] = useState<TradeType | "all">("all");
  const [statusFilter, setStatusFilter] = useState<
    RelationshipStatus | SubcontractJobStatus | "all"
  >("all");
  const [selectedPartnerId, setSelectedPartnerId] = useState<string | null>(
    null,
  );
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [partnerPanelMode, setPartnerPanelMode] =
    useState<PartnerPanelMode>("empty");

  useEffect(() => {
    const timer = setTimeout(() => {
      setPartners(mockNetworkPartners);
      setJobs(mockSubcontractJobs);
      setIsLoading(false);
    }, 600);

    return () => clearTimeout(timer);
  }, []);

  function handleTabChange(tab: NetworkTab) {
    setActiveTab(tab);
    setSearch("");
    setStatusFilter("all");
    setSelectedPartnerId(null);
    setSelectedJobId(null);
    setPartnerPanelMode("empty");
  }

  function handleAddPartner() {
    setSelectedPartnerId(null);
    setPartnerPanelMode("create");
  }

  function handleSelectPartner(partnerId: string) {
    setSelectedPartnerId(partnerId);
    setPartnerPanelMode("detail");
  }

  function handleClosePartnerPanel() {
    setSelectedPartnerId(null);
    setPartnerPanelMode("empty");
  }

  function handleCreatePartner(data: PartnerFormData) {
    const newPartner = formDataToPartner(data);
    setPartners((prev) => [newPartner, ...prev]);
    setSelectedPartnerId(newPartner.id);
    setPartnerPanelMode("detail");
  }

  const filteredPartners = useMemo(
    () =>
      filterPartners(
        partners,
        search,
        tradeFilter,
        statusFilter as RelationshipStatus | "all",
      ),
    [partners, search, tradeFilter, statusFilter],
  );

  const jobDirection =
    activeTab === "open-jobs"
      ? "open"
      : activeTab === "sent-work"
        ? "sent"
        : activeTab === "received-work"
          ? "received"
          : undefined;

  const filteredJobs = useMemo(() => {
    if (!jobDirection) return [];
    return filterSubcontractJobs(
      jobs,
      search,
      statusFilter as SubcontractJobStatus | "all",
      tradeFilter,
      jobDirection,
    );
  }, [jobs, search, statusFilter, tradeFilter, jobDirection]);

  const revenueSummary = useMemo(
    () => getNetworkRevenueSummary(partners, jobs),
    [partners, jobs],
  );

  const filteredRevenuePartners = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return revenueSummary.revenueByPartner;

    return revenueSummary.revenueByPartner.filter((row) => {
      const haystack = [row.partnerCompanyName, row.tradeType]
        .join(" ")
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [revenueSummary.revenueByPartner, search]);

  const selectedPartner =
    partners.find((p) => p.id === selectedPartnerId) ?? null;
  const selectedJob = jobs.find((j) => j.id === selectedJobId) ?? null;

  if (isLoading) {
    return <NetworkLoadingState />;
  }

  const isPartnerTab = activeTab === "my-network";
  const isJobTab = Boolean(jobDirection);
  const isRevenueTab = activeTab === "revenue-tracker";

  const listCount = isPartnerTab
    ? filteredPartners.length
    : isJobTab
      ? filteredJobs.length
      : filteredRevenuePartners.length;

  const hasNoData = isPartnerTab
    ? partners.length === 0
    : isJobTab
      ? jobs.filter((j) => j.direction === jobDirection).length === 0
      : revenueSummary.revenueByPartner.length === 0;

  const hasNoResults = !hasNoData && listCount === 0;
  const showPartnerFilters = isPartnerTab && partners.length > 0;

  const filterBar =
    showPartnerFilters || (!isPartnerTab && !hasNoData) ? (
      <NetworkSearchFilterBar
        tab={activeTab}
        search={search}
        tradeFilter={tradeFilter}
        statusFilter={statusFilter}
        onSearchChange={setSearch}
        onTradeFilterChange={setTradeFilter}
        onStatusFilterChange={setStatusFilter}
        resultCount={listCount}
      />
    ) : null;

  return (
    <div className="flex min-w-0 flex-col gap-4 lg:h-[calc(100dvh-7rem)] lg:overflow-hidden">
      <NetworkPageHeader activeTab={activeTab} onTabChange={handleTabChange} />

      {isRevenueTab ? (
        hasNoData ? (
          <NetworkEmptyState variant="no-revenue" />
        ) : (
          <div className="flex min-h-0 flex-1 flex-col gap-4 lg:overflow-hidden">
            <div className="shrink-0 lg:overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              {filterBar}
            </div>
            {hasNoResults ? (
              <NetworkEmptyState variant="no-results" />
            ) : (
              <PartnerRevenueStats
                summary={{
                  ...revenueSummary,
                  revenueByPartner: filteredRevenuePartners,
                }}
              />
            )}
          </div>
        )
      ) : (
        <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-4 lg:flex-row lg:overflow-hidden">
          <section className={`${listDetailListSectionClassName} flex min-h-[16rem] min-w-0 flex-[1_1_55%] flex-col lg:overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm lg:min-h-0 lg:flex-1`}>
            <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-4">
              <div className="min-w-0 flex-1">
                <h2 className="text-base font-bold text-slate-900">
                  {NETWORK_TAB_OPTIONS.find((t) => t.value === activeTab)?.label}
                </h2>
                <p className="text-xs text-slate-500">
                  {getNetworkTabDescription(activeTab)}
                </p>
              </div>
              {isPartnerTab ? (
                <button
                  type="button"
                  onClick={handleAddPartner}
                  className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-cyan-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-cyan-700"
                >
                  <UserPlus className="h-4 w-4" />
                  Add Partner
                </button>
              ) : null}
            </div>

            {filterBar ? <div className="shrink-0">{filterBar}</div> : null}

            <div className="@container min-h-0 min-w-0 flex-1 overflow-x-hidden lg:overflow-y-auto">
              {isPartnerTab ? (
                <MyNetworkContent
                  partners={filteredPartners}
                  selectedPartnerId={selectedPartnerId}
                  hasNoData={hasNoData}
                  hasNoResults={hasNoResults}
                  onSelectPartner={handleSelectPartner}
                  onAddPartner={handleAddPartner}
                />
              ) : hasNoData ? (
                <NetworkEmptyState variant="no-jobs" />
              ) : hasNoResults ? (
                <NetworkEmptyState variant="no-results" />
              ) : (
                <SubcontractJobsTable
                  jobs={filteredJobs}
                  selectedId={selectedJobId}
                  onSelect={(job) => setSelectedJobId(job.id)}
                />
              )}
            </div>
          </section>

          {isPartnerTab ? (
            <PartnerDetailsPanel
              mode={partnerPanelMode}
              partner={selectedPartner}
              onClose={handleClosePartnerPanel}
              onCreateSubmit={handleCreatePartner}
              onCreateCancel={handleClosePartnerPanel}
            />
          ) : (
            <SubcontractJobDetailsPanel
              job={selectedJob}
              onClose={() => setSelectedJobId(null)}
            />
          )}
        </div>
      )}
    </div>
  );
}
