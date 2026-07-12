"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { prepareLeadEstimateAction } from "@/app/actions/leads";
import { isNorthStarShellEnabled } from "@/lib/beta/north-star-shell";
import type { LeadAssignableMember } from "@/lib/database/queries/leads";
import {
  MasterListPageLayout,
  MasterPageSurface,
  masterListPagePrimaryActionClass,
  masterListPageScrollRegionClass,
  masterListPageSurfaceClass,
} from "@/shared/design-system/shell";
import { northStarListTokens as lt } from "@/shared/design-system/north-star/tokens";
import { SettingsAlertBanner } from "@/shared/components/settings/SettingsAlertBanner";
import { LeadDetailPanel } from "@/shared/components/leads/LeadDetailPanel";
import { LeadList } from "@/shared/components/leads/LeadList";
import { LeadQueueTabs } from "@/shared/components/leads/LeadQueueTabs";
import { LeadSearchFilterBar } from "@/shared/components/leads/LeadSearchFilterBar";
import { LeadsEmptyState } from "@/shared/components/leads/LeadsEmptyState";
import {
  countLeadsForWorkQueue,
  filterLeadsForWorkQueue,
  resolveInitialLeadWorkQueue,
  type LeadWorkQueue,
} from "@/shared/components/leads/lead-work-queues";
import { useCompanyTimezone } from "@/shared/lib/company-timezone";
import type { LeadCreateOutcome } from "@/shared/components/leads/LeadForm";
import { compareLeadsByField } from "@/shared/lib/leads/lead-status";
import { formatActionError } from "@/shared/lib/operational-errors";
import type { LeadActivity } from "@/shared/types/lead-activity";
import {
  formatLeadName,
  formatLeadSource,
  formatLeadStatus,
  type Lead,
  type LeadSortField,
  type LeadStatus,
} from "@/shared/types/lead";

type PanelMode = "detail" | "create" | "empty";

type LeadsPageViewProps = {
  initialLeads: Lead[];
  activitiesByLeadId: Record<string, LeadActivity[]>;
  assignableMembers: LeadAssignableMember[];
  aiFeaturesEnabled: boolean;
  aiDraftingConfigured: boolean;
  initialSelectedId?: string;
  initialCreate?: boolean;
  initialStatusFilter?: LeadStatus;
  initialFollowUpDue?: boolean;
  initialWorkQueue?: LeadWorkQueue;
};

function filterLeads(
  leads: Lead[],
  search: string,
  statusFilter: LeadStatus | "all",
): Lead[] {
  const query = search.trim().toLowerCase();

  return leads.filter((lead) => {
    const matchesStatus = statusFilter === "all" || lead.status === statusFilter;
    if (!matchesStatus) {
      return false;
    }

    if (!query) {
      return true;
    }

    const haystack = [
      formatLeadName(lead),
      lead.phone,
      lead.email,
      formatLeadSource(lead.source),
      formatLeadStatus(lead.status),
      lead.assignedUserName,
      lead.lastActivityLabel,
    ]
      .join(" ")
      .toLowerCase();

    return haystack.includes(query);
  });
}

export function LeadsPageView({
  initialLeads,
  activitiesByLeadId,
  assignableMembers,
  aiFeaturesEnabled,
  aiDraftingConfigured,
  initialSelectedId,
  initialCreate = false,
  initialStatusFilter,
  initialFollowUpDue = false,
  initialWorkQueue,
}: LeadsPageViewProps) {
  const router = useRouter();
  const timeZone = useCompanyTimezone();
  const [leads, setLeads] = useState(initialLeads);
  const [search, setSearch] = useState("");
  const [workQueue, setWorkQueue] = useState<LeadWorkQueue>(() =>
    resolveInitialLeadWorkQueue(
      initialStatusFilter,
      initialFollowUpDue,
      initialWorkQueue,
    ),
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

  useEffect(() => {
    setLeads(initialLeads);
  }, [initialLeads]);

  useEffect(() => {
    if (
      initialSelectedId &&
      initialLeads.some((lead) => lead.id === initialSelectedId)
    ) {
      setSelectedId(initialSelectedId);
      setPanelMode("detail");
    }
  }, [initialLeads, initialSelectedId]);

  const queueCounts = useMemo(
    () =>
      ({
        "needs-contact": countLeadsForWorkQueue(
          leads,
          "needs-contact",
          timeZone,
        ),
        qualified: countLeadsForWorkQueue(leads, "qualified", timeZone),
        "estimate-ready": countLeadsForWorkQueue(
          leads,
          "estimate-ready",
          timeZone,
        ),
        past: countLeadsForWorkQueue(leads, "past", timeZone),
      }) satisfies Record<LeadWorkQueue, number>,
    [leads, timeZone],
  );

  const queueScopedLeads = useMemo(
    () => filterLeadsForWorkQueue(leads, workQueue, timeZone),
    [leads, workQueue, timeZone],
  );

  const filteredLeads = useMemo(() => {
    const filtered = filterLeads(queueScopedLeads, search, statusFilter);
    return [...filtered].sort((left, right) =>
      compareLeadsByField(left, right, sortField),
    );
  }, [queueScopedLeads, search, sortField, statusFilter]);

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

  function handleQueueChange(queue: LeadWorkQueue) {
    setWorkQueue(queue);
    setStatusFilter("all");
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

        const params = new URLSearchParams({
          customerId: result.customerId,
          create: "1",
          leadId: lead.id,
        });
        router.push(`/estimates?${params.toString()}`);
      });
      return;
    }

    setSelectedId(lead.id);
    setPanelMode("detail");
  }

  const hasNoLeads = leads.length === 0;
  const hasNoResults = !hasNoLeads && filteredLeads.length === 0;
  const northStar = isNorthStarShellEnabled();

  return (
    <MasterListPageLayout
      title="Leads"
      subtitle="Contact, qualify, and convert new opportunities."
      density="compact"
      primaryAction={
        <button
          type="button"
          onClick={handleCreateLead}
          className={
            northStar
              ? `north-star-leads-primary-action ${lt.primaryAction}`
              : masterListPagePrimaryActionClass
          }
        >
          <Plus className="h-3.5 w-3.5" />
          New Lead
        </button>
      }
      banners={
        createError ? (
          <SettingsAlertBanner tone="error">{createError}</SettingsAlertBanner>
        ) : undefined
      }
      className={northStar ? lt.pageCanvas : undefined}
      headerClassName={northStar ? lt.pageHeader : undefined}
      headerSurfaceVariant={northStar ? "northStar" : "default"}
      headerTitleClassName={northStar ? lt.pageHeaderTitle : undefined}
      headerSubtitleClassName={northStar ? lt.pageHeaderSubtitle : undefined}
    >
      <MasterPageSurface
        variant={northStar ? "northStarList" : "card"}
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
          {!hasNoLeads ? (
            <div
              className={
                northStar
                  ? lt.viewTabsBand
                  : "shrink-0 border-b border-slate-100/90 px-3 py-1.5 sm:px-4"
              }
            >
              <LeadQueueTabs
                activeQueue={workQueue}
                onQueueChange={handleQueueChange}
                counts={queueCounts}
                northStar={northStar}
              />
            </div>
          ) : null}

          {!hasNoLeads ? (
            <LeadSearchFilterBar
              search={search}
              statusFilter={statusFilter}
              sortField={sortField}
              onSearchChange={setSearch}
              onStatusFilterChange={setStatusFilter}
              onSortFieldChange={setSortField}
              resultCount={filteredLeads.length}
              northStar={northStar}
              showStatusFilter={workQueue === "past"}
            />
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
              <LeadList
                leads={filteredLeads}
                selectedId={selectedId}
                onSelect={handleSelectLead}
                timeZone={timeZone}
                northStar={northStar}
              />
            )}
          </div>
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
    </MasterListPageLayout>
  );
}
