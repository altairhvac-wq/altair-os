"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { prepareLeadEstimateAction } from "@/app/actions/leads";
import { loadLeadsPageAction } from "@/app/actions/list-pages";
import { PagedListFooter } from "@/shared/components/lists/PagedListFooter";
import {
  usePagedList,
  useUrlParamState,
  type PagedListSnapshot,
} from "@/shared/components/lists/usePagedList";
import type { LeadPipelineAggregates } from "@/lib/database/queries/leads-page";
import { isNorthStarShellEnabled } from "@/lib/beta/north-star-shell";
import type { LeadAssignableMember } from "@/lib/database/queries/leads";
import {
  MasterListPageLayout,
  MasterPageSurface,
  masterListPageScrollRegionClass,
  masterListPageSurfaceClass,
} from "@/shared/design-system/shell";
import { Button } from "@/shared/design-system/components";
import { SettingsAlertBanner } from "@/shared/components/settings/SettingsAlertBanner";
import { LeadDetailPanel } from "@/shared/components/leads/LeadDetailPanel";
import { LeadList } from "@/shared/components/leads/LeadList";
import { LeadSearchFilterBar } from "@/shared/components/leads/LeadSearchFilterBar";
import { LeadsEmptyState } from "@/shared/components/leads/LeadsEmptyState";
import { LeadsStatStrip } from "@/shared/components/leads/LeadsStatStrip";
import {
  filterLeadsForListFilter,
  resolveInitialLeadListFilter,
  type LeadListFilter,
} from "@/shared/components/leads/lead-work-queues";
import { LeadPipelineMetricsHeader } from "@/shared/components/customers/LeadPipelineMetricsHeader";
import {
  buildLeadsGlanceStats,
  buildLeadsGlanceStatsFromCounts,
} from "@/shared/lib/leads/leads-glance-stats";
import {
  buildLeadPipelineMetrics,
  buildLeadPipelineMetricsFromAggregates,
} from "@/shared/lib/leads/lead-metrics";
import { useCompanyTimezone } from "@/shared/lib/company-timezone";
import type { LeadCreateOutcome } from "@/shared/components/leads/LeadForm";
import { compareLeadsByField } from "@/shared/lib/leads/lead-status";
import { filterLeadsBySearch } from "@/shared/lib/leads/lead-search";
import { formatActionError } from "@/shared/lib/operational-errors";
import { buildSalesHubHref } from "@/shared/lib/sales/sales-hub";
import type { LeadActivity } from "@/shared/types/lead-activity";
import {
  type Lead,
  type LeadSortField,
  type LeadStatus,
} from "@/shared/types/lead";
import { customerMissionClasses as cm } from "@/shared/components/customers/customer-list-presentation";

type PanelMode = "detail" | "create" | "empty";

type LeadsPageViewProps = {
  initialLeads: Lead[];
  /**
   * One server-paged page.
   *
   * When present, the pill, the search and the counts have all been applied by
   * the database over the whole tenant, and the client-side equivalents are
   * skipped rather than re-run over a subset of it.
   */
  serverPage?: PagedListSnapshot<Lead>;
  /** Pill counts over the whole book — see leads-page.ts. */
  serverFilterCounts?: Record<LeadListFilter, number>;
  /** Tenant-wide pipeline counts from migration 160. */
  serverAggregates?: LeadPipelineAggregates;
  activitiesByLeadId: Record<string, LeadActivity[]>;
  assignableMembers: LeadAssignableMember[];
  aiFeaturesEnabled: boolean;
  aiDraftingConfigured: boolean;
  initialSelectedId?: string;
  initialCreate?: boolean;
  initialStatusFilter?: LeadStatus;
  initialFollowUpDue?: boolean;
  initialListFilter?: LeadListFilter;
  /**
   * When true, omit MasterListPageLayout — Customers hub hosts page chrome.
   * Shows MC v2 pipeline metrics above the working lead list.
   */
  embedded?: boolean;
  /** Hub registers New Lead header action against this handler. */
  onRegisterCreateHandler?: (handler: () => void) => void;
};

export function LeadsPageView({
  initialLeads,
  serverPage,
  serverFilterCounts,
  serverAggregates,
  activitiesByLeadId,
  assignableMembers,
  aiFeaturesEnabled,
  aiDraftingConfigured,
  initialSelectedId,
  initialCreate = false,
  initialStatusFilter,
  initialFollowUpDue = false,
  initialListFilter,
  embedded = false,
  onRegisterCreateHandler,
}: LeadsPageViewProps) {
  const router = useRouter();
  const timeZone = useCompanyTimezone();
  const isServerPaged = Boolean(serverPage);

  // Hooks cannot be conditional, so the unpaged path gets a snapshot describing
  // the array it was handed. Memoised because usePagedList treats a new
  // snapshot object as "the server sent a fresh first page" and resets.
  const snapshot = useMemo<PagedListSnapshot<Lead>>(
    () =>
      serverPage ?? {
        rows: initialLeads,
        nextCursor: null,
        totalCount: initialLeads.length,
        hasMore: false,
      },
    [serverPage, initialLeads],
  );

  // What the server actually filtered this page by. Read from the URL rather
  // than from local input state, which may be mid-debounce, and from the pill
  // the server was told about rather than the one being highlighted.
  const [urlSearch, setUrlSearch] = useUrlParamState("q", "", {
    debounceMs: 300,
  });
  const [, setUrlQueue] = useUrlParamState("queue", "");

  const serverFilter = resolveInitialLeadListFilter(
    initialStatusFilter,
    initialFollowUpDue,
    initialListFilter,
  );

  const paged = usePagedList<Lead>(
    snapshot,
    useCallback(
      (cursor) =>
        // Both must match what produced the first page, or "load more"
        // continues a different list from where this one stopped.
        loadLeadsPageAction({
          filter: serverFilter,
          search: urlSearch,
          cursor,
        }),
      [serverFilter, urlSearch],
    ),
  );

  const [leads, setLeads] = useState<Lead[]>(snapshot.rows);
  const [leadsSource, setLeadsSource] = useState<Lead[]>(snapshot.rows);
  const incomingLeads = isServerPaged ? paged.rows : initialLeads;
  if (leadsSource !== incomingLeads) {
    setLeadsSource(incomingLeads);
    setLeads(incomingLeads);
  }
  const [localSearch, setLocalSearch] = useState("");
  const search = isServerPaged ? urlSearch : localSearch;
  const setSearch = isServerPaged ? setUrlSearch : setLocalSearch;
  const [listFilter, setListFilter] = useState<LeadListFilter>(
    () => serverFilter,
  );
  const [statusFilter, setStatusFilter] = useState<LeadStatus | "all">(
    initialStatusFilter ?? "all",
  );
  const [createError, setCreateError] = useState<string | null>(null);
  const [, startCreateTransition] = useTransition();
  const [sortField, setSortField] = useState<LeadSortField>("createdAt");
  const [selectedId, setSelectedId] = useState<string | null>(
    initialSelectedId ?? null,
  );
  const [panelMode, setPanelMode] = useState<PanelMode>(() => {
    if (initialCreate) return "create";
    if (initialSelectedId) return "detail";
    return "empty";
  });
  const [selectedProp, setSelectedProp] = useState(initialSelectedId);
  if (initialSelectedId !== selectedProp) {
    setSelectedProp(initialSelectedId);
    if (
      initialSelectedId &&
      initialLeads.some((lead) => lead.id === initialSelectedId)
    ) {
      setSelectedId(initialSelectedId);
      setPanelMode("detail");
    }
  }

  useEffect(() => {
    if (!onRegisterCreateHandler) {
      return;
    }

    onRegisterCreateHandler(() => {
      setSelectedId(null);
      setPanelMode("create");
      setCreateError(null);
    });
  }, [onRegisterCreateHandler]);

  // Counted by the database over the whole book when it can be. The array
  // version only ever saw the rows that had been shipped, which on a tenant
  // past PostgREST's 1,000-row ceiling was a fraction of them.
  const glanceStats = useMemo(
    () =>
      serverFilterCounts
        ? buildLeadsGlanceStatsFromCounts(serverFilterCounts)
        : buildLeadsGlanceStats({ leads, timeZone }),
    [serverFilterCounts, leads, timeZone],
  );

  const pipelineMetrics = useMemo(
    () =>
      serverAggregates
        ? buildLeadPipelineMetricsFromAggregates(serverAggregates)
        : buildLeadPipelineMetrics(leads, undefined, timeZone),
    [serverAggregates, leads, timeZone],
  );

  const queueScopedLeads = useMemo(
    () =>
      isServerPaged
        ? leads
        : filterLeadsForListFilter(leads, listFilter, timeZone),
    [isServerPaged, leads, listFilter, timeZone],
  );

  const filteredLeads = useMemo(() => {
    // The search and the status dropdown are applied by the database when the
    // list is server-paged; re-running them here would narrow one page and
    // present the result as the whole list.
    const filtered = isServerPaged
      ? queueScopedLeads
      : filterLeadsBySearch(queueScopedLeads, search, statusFilter);
    return [...filtered].sort((left, right) =>
      compareLeadsByField(left, right, sortField),
    );
  }, [isServerPaged, queueScopedLeads, search, sortField, statusFilter]);

  const selectedLead =
    leads.find((lead) => lead.id === selectedId) ?? null;
  const selectedActivities = selectedLead
    ? activitiesByLeadId[selectedLead.id] ?? []
    : [];

  function handleSelectLead(lead: Lead) {
    setSelectedId(lead.id);
    setPanelMode("detail");
  }

  function handleCreateLead() {
    setSelectedId(null);
    setPanelMode("create");
  }

  function handleClosePanel() {
    setSelectedId(null);
    setPanelMode("empty");
  }

  function handleLeadUpdated(updated: Lead) {
    setLeads((current) =>
      current.map((lead) => (lead.id === updated.id ? updated : lead)),
    );
  }

  function handleQueueChange(queue: LeadListFilter) {
    setListFilter(queue);
    setStatusFilter("all");
    if (isServerPaged) {
      // The pill is a database filter now. Highlighting it without telling the
      // server would leave the list showing the previous filter's page.
      setUrlQueue(queue);
    }
  }

  function handleCreateSuccess(lead: Lead, outcome: LeadCreateOutcome = "save") {
    setLeads((current) => [lead, ...current]);
    setCreateError(null);

    if (outcome === "save") {
      setSelectedId(null);
      setPanelMode("empty");
      return;
    }

    if (outcome === "estimate") {
      startCreateTransition(async () => {
        const result = await prepareLeadEstimateAction(lead.id);
        if (result.error || !result.customerId) {
          setCreateError(
            formatActionError(
              result.error,
              "Lead saved, but we couldn't prepare the estimate.",
            ),
          );
          setSelectedId(lead.id);
          setPanelMode("detail");
          return;
        }

        if (result.lead) {
          setLeads((current) =>
            current.map((entry) =>
              entry.id === result.lead!.id ? result.lead! : entry,
            ),
          );
        }

        router.push(
          buildSalesHubHref("estimates", {
            customerId: result.customerId,
            create: "1",
            leadId: lead.id,
          }),
        );
      });
      return;
    }

    setSelectedId(lead.id);
    setPanelMode("detail");
  }

  const hasNoLeads = leads.length === 0;
  const hasNoResults = !hasNoLeads && filteredLeads.length === 0;
  const northStar = isNorthStarShellEnabled();

  const panelBody = (
    <>
      <MasterPageSurface
        variant="workspace"
        className={masterListPageSurfaceClass}
      >
        {embedded ? (
          <div className="space-y-3 border-b border-altair-border/70 px-1 pb-3 sm:px-0">
            <LeadPipelineMetricsHeader metrics={pipelineMetrics} />
          </div>
        ) : null}

        {!hasNoLeads ? (
          <div className={cm.filterRegion}>
            {embedded ? (
              <div className="border-b border-altair-border/70 px-1 pb-2 sm:px-0">
                <LeadsStatStrip
                  stats={glanceStats}
                  activeQueue={listFilter}
                  onFilterQueue={handleQueueChange}
                />
              </div>
            ) : null}
            <LeadSearchFilterBar
              search={search}
              statusFilter={statusFilter}
              sortField={sortField}
              listFilter={listFilter}
              onSearchChange={setSearch}
              onStatusFilterChange={setStatusFilter}
              onSortFieldChange={setSortField}
              onListFilterChange={handleQueueChange}
              resultCount={
                isServerPaged ? paged.totalCount : filteredLeads.length
              }
              showStatusFilter={listFilter === "past"}
            />
          </div>
        ) : null}

        <div className={masterListPageScrollRegionClass}>
          {hasNoLeads ? (
            <LeadsEmptyState
              variant="no-leads"
              onCreateLead={handleCreateLead}
              northStar={northStar}
            />
          ) : hasNoResults ? (
            <LeadsEmptyState variant="no-results" northStar={northStar} />
          ) : (
            <>
              <LeadList
                leads={filteredLeads}
                selectedId={selectedId}
                onSelect={handleSelectLead}
                timeZone={timeZone}
              />
              {isServerPaged ? (
                <PagedListFooter
                  loadedCount={paged.loadedCount}
                  totalCount={paged.totalCount}
                  hasMore={paged.hasMore}
                  isLoadingMore={paged.isLoadingMore}
                  error={paged.error}
                  onLoadMore={paged.loadMore}
                  noun="leads"
                />
              ) : null}
            </>
          )}
        </div>
      </MasterPageSurface>

      <LeadDetailPanel
        mode={panelMode}
        lead={selectedLead}
        initialActivities={selectedActivities}
        assignableMembers={assignableMembers}
        aiFeaturesEnabled={aiFeaturesEnabled}
        aiDraftingConfigured={aiDraftingConfigured}
        onClose={handleClosePanel}
        onCreateSuccess={handleCreateSuccess}
        onCreateCancel={handleClosePanel}
        onLeadUpdated={handleLeadUpdated}
        northStar={northStar}
      />
    </>
  );

  if (embedded) {
    return (
      <>
        {createError ? (
          <div className="mb-2">
            <SettingsAlertBanner tone="error">{createError}</SettingsAlertBanner>
          </div>
        ) : null}
        {panelBody}
      </>
    );
  }

  return (
    <MasterListPageLayout
      title="Leads"
      subtitle="Contact, qualify, and convert new opportunities."
      density="compact"
      headerSurfaceVariant="default"
      headerTitleClassName="min-w-0 text-base font-semibold tracking-tight text-altair-ink-on-paper sm:text-lg"
      headerSubtitleClassName="min-w-0 truncate text-[11px] leading-snug text-altair-ink-on-paper-muted"
      headerClassName="py-1.5"
      headerCenter={
        hasNoLeads ? undefined : (
          <LeadsStatStrip
            stats={glanceStats}
            activeQueue={listFilter}
            onFilterQueue={handleQueueChange}
          />
        )
      }
      primaryAction={
        <Button
          size="sm"
          onClick={handleCreateLead}
          leadingIcon={<Plus className="h-3.5 w-3.5" />}
        >
          New Lead
        </Button>
      }
      banners={
        createError ? (
          <SettingsAlertBanner tone="error">{createError}</SettingsAlertBanner>
        ) : undefined
      }
    >
      {panelBody}
    </MasterListPageLayout>
  );
}
