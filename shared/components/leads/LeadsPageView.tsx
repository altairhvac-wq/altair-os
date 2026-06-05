"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import type { LeadAssignableMember } from "@/lib/database/queries/leads";
import { ListCommandCenterLayout } from "@/shared/components/layout/ListCommandCenterLayout";
import { LeadDetailPanel } from "@/shared/components/leads/LeadDetailPanel";
import { LeadList } from "@/shared/components/leads/LeadList";
import { LeadSearchFilterBar } from "@/shared/components/leads/LeadSearchFilterBar";
import { LeadsEmptyState } from "@/shared/components/leads/LeadsEmptyState";
import { useCompanyTimezone } from "@/shared/lib/company-timezone";
import { compareLeadsByField } from "@/shared/lib/leads/lead-status";
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
  initialSelectedId?: string;
  initialCreate?: boolean;
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
  initialSelectedId,
  initialCreate = false,
}: LeadsPageViewProps) {
  const timeZone = useCompanyTimezone();
  const [leads, setLeads] = useState(initialLeads);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<LeadStatus | "all">("all");
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
    const filtered = filterLeads(leads, search, statusFilter);
    return [...filtered].sort((left, right) =>
      compareLeadsByField(left, right, sortField),
    );
  }, [leads, search, sortField, statusFilter]);

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

  function handleCreateSuccess(lead: Lead) {
    setLeads((current) => [lead, ...current]);
    setSelectedId(lead.id);
    setPanelMode("detail");
  }

  const hasNoLeads = leads.length === 0;
  const hasNoResults = !hasNoLeads && filteredLeads.length === 0;
  const isPanelOpen = panelMode !== "empty";

  return (
    <ListCommandCenterLayout
      title="Leads"
      subtitle="Track opportunities before they become customers"
      primaryAction={
        <button
          type="button"
          onClick={handleCreateLead}
          className="inline-flex shrink-0 items-center gap-2 admin-btn-primary"
        >
          <Plus className="h-4 w-4" />
          Create Lead
        </button>
      }
      className={
        isPanelOpen
          ? "max-lg:h-[calc(100dvh-7rem)] max-lg:min-h-0 max-lg:overflow-hidden"
          : undefined
      }
    >
      <section
        className={`flex min-h-[16rem] min-w-0 lg:flex-1 flex-col overflow-hidden admin-card lg:min-h-0 ${
          isPanelOpen ? "max-lg:hidden" : ""
        }`}
      >
        {!hasNoLeads ? (
          <LeadSearchFilterBar
            search={search}
            statusFilter={statusFilter}
            sortField={sortField}
            onSearchChange={setSearch}
            onStatusFilterChange={setStatusFilter}
            onSortFieldChange={setSortField}
            resultCount={filteredLeads.length}
          />
        ) : null}

        <div className="min-h-0 min-w-0 flex-1 overflow-x-hidden lg:overflow-y-auto">
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
      </section>

      <LeadDetailPanel
        mode={panelMode}
        lead={selectedLead}
        initialActivities={selectedActivities}
        assignableMembers={assignableMembers}
        aiFeaturesEnabled={aiFeaturesEnabled}
        onClose={handleClosePanel}
        onCreateSuccess={handleCreateSuccess}
        onCreateCancel={handleClosePanel}
        onLeadUpdated={handleLeadUpdated}
      />
    </ListCommandCenterLayout>
  );
}
