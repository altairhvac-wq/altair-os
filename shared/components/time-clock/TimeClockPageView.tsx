"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import {
  mockActiveSession,
  mockTimeEntries,
} from "@/shared/data/mock-time-entries";
import {
  calculateMockHours,
  formatMockTimeEntryStatus,
  type MockActiveTechnicianSession,
  type MockTimeEntry,
  type MockTimeEntryFormData,
  type MockTimeEntryStatus,
} from "@/shared/types/time-entry-mock";
import { listDetailListSectionClassName } from "@/shared/components/layout/list-detail-layout";
import {
  MasterContentStack,
  MasterPageCanvas,
  MasterPageSurface,
  MasterShellPage,
  masterListPagePrimaryActionClass,
  masterPanelHeaderClass,
} from "@/shared/design-system/shell";
import {
  masterListPageScrollRegionClass,
  masterListPageSurfaceClass,
} from "@/shared/design-system/shell/tokens";
import { TimeClockEmptyState } from "./TimeClockEmptyState";
import { TimeClockPageViewLoadingState } from "./TimeClockLoadingState";
import { TimeClockWidget } from "./TimeClockWidget";
import { TimeEntriesTable } from "./TimeEntriesTable";
import { TimeEntryDetailsPanel } from "./TimeEntryDetailsPanel";
import { TimeSearchFilterBar } from "./TimeSearchFilterBar";
import { WeeklySummaryCards } from "./WeeklySummaryCards";

type PanelMode = "detail" | "create" | "edit" | "empty";

function filterEntries(
  entries: MockTimeEntry[],
  search: string,
  statusFilter: MockTimeEntryStatus | "all",
): MockTimeEntry[] {
  const query = search.trim().toLowerCase();

  return entries.filter((entry) => {
    const matchesStatus =
      statusFilter === "all" || entry.status === statusFilter;
    if (!matchesStatus) return false;
    if (!query) return true;

    const haystack = [
      entry.entryNumber,
      entry.technician,
      entry.jobNumber ?? "",
      entry.customerName ?? "",
      formatMockTimeEntryStatus(entry.status),
      entry.status,
      entry.notes ?? "",
    ]
      .join(" ")
      .toLowerCase();

    return haystack.includes(query);
  });
}

function datetimeLocalToIso(value: string): string {
  return new Date(value).toISOString();
}

function formDataToEntry(
  data: MockTimeEntryFormData,
  existingCount: number,
  existing?: MockTimeEntry,
): MockTimeEntry {
  const today = new Date().toISOString().split("T")[0];
  const clockInAt = datetimeLocalToIso(data.clockInAt);
  const clockOutAt = data.clockOutAt
    ? datetimeLocalToIso(data.clockOutAt)
    : undefined;
  const totalHours =
    clockOutAt != null ? calculateMockHours(clockInAt, clockOutAt) : undefined;
  const isActive = !clockOutAt;

  return {
    id: existing?.id ?? `time-${Date.now()}`,
    entryNumber: existing?.entryNumber ?? `TIME-${2001 + existingCount}`,
    technician: data.technician,
    clockInAt,
    clockOutAt,
    totalHours,
    jobNumber: data.jobNumber || undefined,
    customerName: data.customerName || undefined,
    isOvertime: data.isOvertime,
    status: isActive ? "active" : data.status,
    notes: data.notes || undefined,
    createdAt: existing?.createdAt ?? today,
  };
}

export function TimeClockPageView() {
  const [entries, setEntries] = useState<MockTimeEntry[]>([]);
  const [activeSession, setActiveSession] =
    useState<MockActiveTechnicianSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<MockTimeEntryStatus | "all">(
    "all",
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [panelMode, setPanelMode] = useState<PanelMode>("empty");

  useEffect(() => {
    const timer = setTimeout(() => {
      setEntries(mockTimeEntries);
      setActiveSession(mockActiveSession);
      setIsLoading(false);
    }, 600);

    return () => clearTimeout(timer);
  }, []);

  const filteredEntries = useMemo(
    () => filterEntries(entries, search, statusFilter),
    [entries, search, statusFilter],
  );

  const selectedEntry = entries.find((entry) => entry.id === selectedId) ?? null;

  function handleSelectEntry(entry: MockTimeEntry) {
    setSelectedId(entry.id);
    setPanelMode("detail");
  }

  function handleNewEntry() {
    setSelectedId(null);
    setPanelMode("create");
  }

  function handleClosePanel() {
    setSelectedId(null);
    setPanelMode("empty");
  }

  function handleCreateSubmit(data: MockTimeEntryFormData) {
    const newEntry = formDataToEntry(data, entries.length);
    setEntries((prev) => [newEntry, ...prev]);
    setSelectedId(newEntry.id);
    setPanelMode("detail");
  }

  function handleEditSubmit(data: MockTimeEntryFormData) {
    if (!selectedEntry) return;
    const updated = formDataToEntry(data, entries.length, selectedEntry);
    setEntries((prev) =>
      prev.map((entry) => (entry.id === selectedEntry.id ? updated : entry)),
    );
    setPanelMode("detail");
  }

  function handleClockIn() {
    if (activeSession) return;

    const now = new Date().toISOString();
    const session: MockActiveTechnicianSession = {
      technician: "Lisa Park",
      clockInAt: now,
      jobNumber: "JOB-1044",
      customerName: "Greenfield Property Group",
    };

    const newEntry: MockTimeEntry = {
      id: `time-${Date.now()}`,
      entryNumber: `TIME-${2001 + entries.length}`,
      technician: session.technician,
      clockInAt: now,
      jobNumber: session.jobNumber,
      customerName: session.customerName,
      isOvertime: false,
      status: "active",
      notes: "Clocked in from time clock widget.",
      createdAt: now.split("T")[0],
    };

    setActiveSession(session);
    setEntries((prev) => [newEntry, ...prev]);
  }

  function handleClockOut() {
    if (!activeSession) return;

    const now = new Date().toISOString();
    const totalHours = calculateMockHours(activeSession.clockInAt, now);

    setEntries((prev) =>
      prev.map((entry) =>
        entry.status === "active" &&
        entry.technician === activeSession.technician
          ? {
              ...entry,
              clockOutAt: now,
              totalHours,
              status: "pending",
            }
          : entry,
      ),
    );
    setActiveSession(null);
  }

  if (isLoading) {
    return <TimeClockPageViewLoadingState />;
  }

  const hasNoEntries = entries.length === 0;
  const hasNoResults = !hasNoEntries && filteredEntries.length === 0;

  return (
    <MasterShellPage fillViewport density="compact">
      <MasterPageCanvas width="standard" className="min-h-0 flex-1">
        <MasterContentStack density="compact" scrollable className="min-h-0 flex-1">
          <WeeklySummaryCards entries={entries} />

          <TimeClockWidget
            activeSession={activeSession}
            onClockIn={handleClockIn}
            onClockOut={handleClockOut}
          />

          <div className="flex min-h-0 flex-1 flex-col gap-4 lg:flex-row lg:overflow-hidden">
            <MasterPageSurface
              variant="card"
              className={`${listDetailListSectionClassName} ${masterListPageSurfaceClass} flex-[1_1_55%] lg:overflow-hidden`}
            >
              <div
                className={`${masterPanelHeaderClass} flex flex-wrap items-center justify-between gap-3`}
              >
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    All time entries
                  </h2>
                  <p className="text-xs text-slate-500">
                    Field hours, job links, and approval workflow
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleNewEntry}
                  className={masterListPagePrimaryActionClass}
                >
                  <Plus className="h-4 w-4" />
                  Manual Entry
                </button>
              </div>

              {!hasNoEntries ? (
                <div className="shrink-0">
                  <TimeSearchFilterBar
                    search={search}
                    statusFilter={statusFilter}
                    onSearchChange={setSearch}
                    onStatusFilterChange={setStatusFilter}
                    resultCount={filteredEntries.length}
                  />
                </div>
              ) : null}

              <div className={masterListPageScrollRegionClass}>
                {hasNoEntries ? (
                  <TimeClockEmptyState
                    variant="no-entries"
                    onCreateEntry={handleNewEntry}
                  />
                ) : hasNoResults ? (
                  <TimeClockEmptyState variant="no-results" />
                ) : (
                  <TimeEntriesTable
                    entries={filteredEntries}
                    selectedId={selectedId}
                    onSelect={handleSelectEntry}
                  />
                )}
              </div>
            </MasterPageSurface>

            <TimeEntryDetailsPanel
              mode={panelMode}
              entry={selectedEntry}
              onClose={handleClosePanel}
              onCreateSubmit={handleCreateSubmit}
              onEditSubmit={handleEditSubmit}
              onCreateCancel={handleClosePanel}
              onEdit={() => setPanelMode("edit")}
            />
          </div>
        </MasterContentStack>
      </MasterPageCanvas>
    </MasterShellPage>
  );
}
