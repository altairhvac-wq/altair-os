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
  masterListPageMobilePanelLockClass,
  masterListPagePrimaryActionClass,
  masterListPageScrollRegionClass,
  masterListPageSurfaceClass,
} from "@/shared/design-system/shell";
import { northStarListTokens as lt } from "@/shared/design-system/north-star/tokens";
import { SettingsAlertBanner } from "@/shared/components/settings/SettingsAlertBanner";
import { LeadDetailPanel } from "@/shared/components/leads/LeadDetailPanel";
import { LeadList } from "@/shared/components/leads/LeadList";
import { LeadSearchFilterBar } from "@/shared/components/leads/LeadSearchFilterBar";
import { LeadsEmptyState } from "@/shared/components/leads/LeadsEmptyState";
import {
  LeadsFollowUpQueue,
  LeadsPipelineSummary,
} from "@/shared/components/leads/north-star-m14";
import { useCompanyTimezone } from "@/shared/lib/company-timezone";
import type { LeadCreateOutcome } from "@/shared/components/leads/LeadForm";
import {
  buildLeadPipelineMetrics,
  selectLeadsNeedingFollowUp,
} from "@/shared/lib/leads/lead-metrics";
import { compareLeadsByField, isLeadFollowUpDue } from "@/shared/lib/leads/lead-status";
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
};

function filterLeads(
  leads: Lead[],
  search: string,
  statusFilter: LeadStatus | "all",
  followUpDueOnly: boolean,
  timeZone: string,
): Lead[] {
  const query = search.trim().toLowerCase();

  return leads.filter((lead) => {
    if (followUpDueOnly && !isLeadFollowUpDue(lead, undefined, timeZone)) {
      return false;
    }

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
}: LeadsPageViewProps) {
  const router = useRouter();
  const timeZone = useCompanyTimezone();
  const [leads, setLeads] = useState(initialLeads);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<LeadStatus | "all">(
    initialStatusFilter ?? "all",
  );
  const [followUpDueOnly, setFollowUpDueOnly] = useState(initialFollowUpDue);
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

  const filteredLeads = useMemo(() => {
    const filtered = filterLeads(
      leads,
      search,
      statusFilter,
      followUpDueOnly,
      timeZone,
    );
    return [...filtered].sort((left, right) =>
      compareLeadsByField(left, right, sortField),
    );
  }, [followUpDueOnly, leads, search, sortField, statusFilter, timeZone]);

  const pipelineMetrics = useMemo(
    () => buildLeadPipelineMetrics(leads, undefined, timeZone),
    [leads, timeZone],
  );

  const followUpQueueLeads = useMemo(
    () => selectLeadsNeedingFollowUp(leads, { limit: 5, timeZone }),
    [leads, timeZone],
  );

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

  function handleStatusFilterChange(value: LeadStatus | "all") {
    setStatusFilter(value);
    if (value !== "all") {
      setFollowUpDueOnly(false);
    }
  }

  function handleFollowUpDueSelect() {
    setFollowUpDueOnly(true);
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
  const isPanelOpen = panelMode !== "empty";
  const northStar = isNorthStarShellEnabled();

  return (
    <MasterListPageLayout
      title="Leads"
      subtitle={
        northStar
          ? "Revenue intake and follow-up command center"
          : "Track opportunities before they become customers"
      }
      eyebrow={northStar ? "Opportunity intake" : undefined}
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
          Create Lead
        </button>
      }
      banners={
        createError ? (
          <SettingsAlertBanner tone="error">{createError}</SettingsAlertBanner>
        ) : undefined
      }
      summary={
        northStar && !hasNoLeads
          ? (
            <LeadsPipelineSummary
              leads={leads}
              statusFilter={statusFilter}
              followUpDueOnly={followUpDueOnly}
              followUpsDue={pipelineMetrics.followUpsDue}
              openLeads={pipelineMetrics.openLeads}
              onStatusFilterChange={handleStatusFilterChange}
              onFollowUpDueSelect={handleFollowUpDueSelect}
            />
          )
          : null
      }
      className={`${isPanelOpen ? masterListPageMobilePanelLockClass : ""} ${
        northStar ? lt.pageCanvas : ""
      }`}
      headerClassName={northStar ? lt.pageHeader : undefined}
      headerSurfaceVariant={northStar ? "northStar" : "default"}
      headerEyebrowClassName={northStar ? lt.pageHeaderEyebrow : undefined}
      headerTitleClassName={northStar ? lt.pageHeaderTitle : undefined}
      headerSubtitleClassName={northStar ? lt.pageHeaderSubtitle : undefined}
    >
      <MasterPageSurface
        variant={northStar ? "northStarList" : "card"}
        className={`${masterListPageSurfaceClass} ${
          isPanelOpen ? "max-lg:hidden" : ""
        } ${northStar ? lt.listSurface : ""}`}
      >
        {northStar ? (
          <div aria-hidden="true" className={lt.listSurfaceTopAccent} />
        ) : null}

        {northStar && !hasNoLeads && !followUpDueOnly && followUpQueueLeads.length > 0 ? (
          <LeadsFollowUpQueue
            leads={followUpQueueLeads}
            timeZone={timeZone}
            onSelectLead={handleSelectLead}
            onViewAll={handleFollowUpDueSelect}
          />
        ) : null}

        {!hasNoLeads ? (
          <>
            <LeadSearchFilterBar
              search={search}
              statusFilter={statusFilter}
              sortField={sortField}
              onSearchChange={setSearch}
              onStatusFilterChange={handleStatusFilterChange}
              onSortFieldChange={setSortField}
              resultCount={filteredLeads.length}
              northStar={northStar}
            />
            {followUpDueOnly ? (
              <div
                className={
                  northStar
                    ? "border-b border-[rgba(138,99,36,0.12)] bg-[#FBF7EF] px-3 pb-3 sm:px-4 lg:px-5"
                    : "border-b border-slate-100/90 px-4 pb-3 sm:px-5"
                }
              >
                <button
                  type="button"
                  onClick={() => setFollowUpDueOnly(false)}
                  className={
                    northStar
                      ? "text-xs font-semibold text-[#8A6324] transition-colors hover:text-[#6B5A2E]"
                      : "text-xs font-semibold text-cyan-700 hover:text-cyan-800"
                  }
                >
                  Clear follow-up due filter
                </button>
              </div>
            ) : null}
          </>
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
      />
    </MasterListPageLayout>
  );
}
