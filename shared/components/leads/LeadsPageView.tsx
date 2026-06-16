"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { prepareLeadEstimateAction } from "@/app/actions/leads";
import type { LeadAssignableMember } from "@/lib/database/queries/leads";
import {
  MasterListPageLayout,
  MasterPageSurface,
  masterListPageMobilePanelLockClass,
  masterListPagePrimaryActionClass,
  masterListPageScrollRegionClass,
  masterListPageSurfaceClass,
} from "@/shared/design-system/shell";
import { SettingsAlertBanner } from "@/shared/components/settings/SettingsAlertBanner";
import { LeadDetailPanel } from "@/shared/components/leads/LeadDetailPanel";
import { LeadList } from "@/shared/components/leads/LeadList";
import { LeadSearchFilterBar } from "@/shared/components/leads/LeadSearchFilterBar";
import { LeadsEmptyState } from "@/shared/components/leads/LeadsEmptyState";
import { useCompanyTimezone } from "@/shared/lib/company-timezone";
import type { LeadCreateOutcome } from "@/shared/components/leads/LeadForm";
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

  return (
    <MasterListPageLayout
      title="Leads"
      subtitle="Track opportunities before they become customers"
      density="compact"
      primaryAction={
        <button
          type="button"
          onClick={handleCreateLead}
          className={masterListPagePrimaryActionClass}
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
      className={isPanelOpen ? masterListPageMobilePanelLockClass : undefined}
    >
      <MasterPageSurface
        variant="card"
        className={`${masterListPageSurfaceClass} ${
          isPanelOpen ? "max-lg:hidden" : ""
        }`}
      >
        {!hasNoLeads ? (
          <>
            <LeadSearchFilterBar
              search={search}
              statusFilter={statusFilter}
              sortField={sortField}
              onSearchChange={setSearch}
              onStatusFilterChange={(value) => {
                setStatusFilter(value);
                if (value !== "all") {
                  setFollowUpDueOnly(false);
                }
              }}
              onSortFieldChange={setSortField}
              resultCount={filteredLeads.length}
            />
            {followUpDueOnly ? (
              <div className="border-b border-slate-100/90 px-4 pb-3 sm:px-5">
                <button
                  type="button"
                  onClick={() => setFollowUpDueOnly(false)}
                  className="text-xs font-semibold text-cyan-700 hover:text-cyan-800"
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
            />
          ) : hasNoResults ? (
            <LeadsEmptyState variant="no-results" />
          ) : (
            <LeadList
              leads={filteredLeads}
              selectedId={selectedId}
              onSelect={handleSelectLead}
              timeZone={timeZone}
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
