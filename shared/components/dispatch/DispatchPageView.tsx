"use client";

import { useMemo, useState, useTransition, useCallback, useEffect, useRef } from "react";
import { BarChart3, SlidersHorizontal, Users } from "lucide-react";
import { assignJobAction, unassignJobAction } from "@/app/actions/dispatch";
import {
  filterDispatchJobs,
  getDispatchSummary,
  hasAssignedJobTechnician,
  type DispatchJob,
  type DispatchJobStatus,
  type Technician,
} from "@/shared/types/dispatch";
import type { DispatchPageFocusState } from "@/shared/lib/dispatch-page-focus";
import type { JobBillingSummariesByJobId } from "@/shared/lib/job-next-business-action";
import { canUpdateJobWorkflowStatus } from "@/lib/database/access-control";
import { useIsBelowLg } from "@/shared/components/mobile/use-mobile-viewport";
import { DispatchBoard } from "./DispatchBoard";
import { DispatchDashboardHeader } from "./DispatchDashboardHeader";
import { DispatchDetailsPanel } from "./DispatchDetailsPanel";
import { MobileSheet, MobileSheetPanel } from "@/shared/components/ui/mobile-sheet";
import { DispatchEmptyState } from "./DispatchEmptyState";
import { DispatchFocusBanner } from "./DispatchFocusBanner";
import { DispatchSearchFilterBar } from "./DispatchSearchFilterBar";
import {
  DispatchSectionActions,
  type DispatchSection,
} from "./DispatchSectionActions";
import { DispatchSectionSheet } from "./DispatchSectionSheet";
import { DispatchSummaryCards } from "./DispatchSummaryCards";
import { TechnicianWorkloadCards } from "./TechnicianWorkloadCards";
import { UnassignedJobsModal } from "./UnassignedJobsModal";

type DispatchPageViewProps = {
  initialJobs: DispatchJob[];
  technicians: Technician[];
  canDispatchJobs: boolean;
  canViewAssignedJobs: boolean;
  canViewBilling: boolean;
  aiFeaturesEnabled?: boolean;
  billingSummaries: JobBillingSummariesByJobId;
  currentUserId: string;
  dispatchPageFocus?: DispatchPageFocusState;
};

export function DispatchPageView({
  initialJobs,
  technicians,
  canDispatchJobs,
  canViewAssignedJobs,
  canViewBilling,
  aiFeaturesEnabled = false,
  billingSummaries,
  currentUserId,
  dispatchPageFocus,
}: DispatchPageViewProps) {
  function canUpdateJobWorkflow(job: DispatchJob): boolean {
    return canUpdateJobWorkflowStatus(
      {
        dispatchJobs: canDispatchJobs,
        viewAssignedJobs: canViewAssignedJobs,
        manageCompany: false,
        manageUsers: false,
        manageCustomers: false,
        manageBilling: false,
        createFieldEstimates: false,
      },
      currentUserId,
      { assignedTechnicianId: job.technicianId ?? null },
    );
  }
  const [jobs, setJobs] = useState(initialJobs);
  const pendingAssignJobIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    setJobs((previous) => {
      const previousById = new Map(previous.map((job) => [job.id, job]));

      return initialJobs.map((serverJob) => {
        const localJob = previousById.get(serverJob.id);

        if (
          pendingAssignJobIdsRef.current.has(serverJob.id) &&
          localJob &&
          hasAssignedJobTechnician(localJob) &&
          !hasAssignedJobTechnician(serverJob) &&
          localJob.status === serverJob.status
        ) {
          return {
            ...serverJob,
            technicianId: localJob.technicianId,
          };
        }

        return serverJob;
      });
    });
  }, [initialJobs]);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<DispatchJobStatus | "all">(
    "all",
  );
  const [technicianFilter, setTechnicianFilter] = useState<string>(
    dispatchPageFocus?.initialTechnicianFilter ?? "all",
  );
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [openSection, setOpenSection] = useState<DispatchSection | null>(null);
  const [showUnassignedModal, setShowUnassignedModal] = useState(false);
  const [assignError, setAssignError] = useState<string | null>(null);
  const [assignSuccess, setAssignSuccess] = useState<string | null>(null);
  const [pendingJobId, setPendingJobId] = useState<string | null>(null);
  const [showAllTechnicians, setShowAllTechnicians] = useState(false);
  const [, startTransition] = useTransition();
  const isBelowLg = useIsBelowLg();

  const filteredJobs = useMemo(
    () =>
      filterDispatchJobs(
        jobs,
        technicians,
        search,
        statusFilter,
        technicianFilter,
      ),
    [jobs, technicians, search, statusFilter, technicianFilter],
  );

  const summary = useMemo(() => getDispatchSummary(jobs), [jobs]);

  const unassignedJobs = useMemo(
    () => filteredJobs.filter((job) => !job.technicianId),
    [filteredJobs],
  );

  const selectedJob = jobs.find((job) => job.id === selectedJobId) ?? null;
  const selectedTechnician = selectedJob?.technicianId
    ? (technicians.find((tech) => tech.id === selectedJob.technicianId) ??
      null)
    : null;

  const handleSelectJob = useCallback((job: DispatchJob) => {
    setSelectedJobId(job.id);
    setAssignError(null);
    setAssignSuccess(null);
    setShowUnassignedModal(false);
    setOpenSection(null);
  }, []);

  const handleClosePanel = useCallback(() => {
    setSelectedJobId(null);
    setAssignError(null);
    setAssignSuccess(null);
  }, []);

  const handleAssign = useCallback(
    (jobId: string, technicianId: string) => {
      if (pendingJobId) {
        return;
      }

      setAssignError(null);
      setAssignSuccess(null);
      setPendingJobId(jobId);
      pendingAssignJobIdsRef.current.add(jobId);

      startTransition(async () => {
        try {
          const result = await assignJobAction(jobId, technicianId);

          if (result.error || !result.job) {
            setAssignError(result.error ?? "Failed to assign job.");
            return;
          }

          const assignedName =
            technicians.find((technician) => technician.id === technicianId)
              ?.name ?? "Technician";
          setAssignSuccess(`Assigned to ${assignedName}.`);

          setJobs((previous) =>
            previous.map((job) => (job.id === result.job!.id ? result.job! : job)),
          );
        } finally {
          pendingAssignJobIdsRef.current.delete(jobId);
          setPendingJobId(null);
        }
      });
    },
    [pendingJobId, technicians],
  );

  const handleUnassign = useCallback(
    (jobId: string) => {
      if (pendingJobId) {
        return;
      }

      setAssignError(null);
      setAssignSuccess(null);
      setPendingJobId(jobId);

      startTransition(async () => {
        try {
          const result = await unassignJobAction(jobId);

          if (result.error || !result.job) {
            setAssignError(result.error ?? "Failed to unassign job.");
            return;
          }

          setAssignSuccess("Technician unassigned.");
          setJobs((previous) =>
            previous.map((job) => (job.id === result.job!.id ? result.job! : job)),
          );
        } finally {
          setPendingJobId(null);
        }
      });
    },
    [pendingJobId],
  );

  const handleStatusUpdated = useCallback(
    (jobId: string, status: DispatchJobStatus) => {
      setJobs((previous) => {
        if (status === "cancelled") {
          return previous.filter((job) => job.id !== jobId);
        }

        return previous.map((job) =>
          job.id === jobId ? { ...job, status } : job,
        );
      });
    },
    [],
  );

  const hasNoJobs = jobs.length === 0;
  const hasNoResults = !hasNoJobs && filteredJobs.length === 0;
  const filtersActive =
    search.trim().length > 0 ||
    statusFilter !== "all" ||
    technicianFilter !== "all";

  const handleOpenSection = useCallback(
    (section: DispatchSection) => {
      setOpenSection((current) => {
        const isClosing = current === section;
        if (!isClosing && isBelowLg) {
          setSelectedJobId(null);
          setAssignError(null);
          setAssignSuccess(null);
        }
        return isClosing ? null : section;
      });
    },
    [isBelowLg],
  );

  const handleCloseSection = useCallback(() => {
    setOpenSection(null);
  }, []);

  const handleOpenUnassigned = useCallback(() => {
    setOpenSection(null);
    setShowUnassignedModal(true);
  }, []);

  const handleCloseUnassignedModal = useCallback(() => {
    setShowUnassignedModal(false);
  }, []);

  const handleTechnicianWorkloadClick = useCallback((technicianId: string) => {
    setTechnicianFilter(technicianId);
    setOpenSection(null);
    setShowUnassignedModal(false);
  }, []);

  const handleToggleShowAllTechnicians = useCallback(() => {
    setShowAllTechnicians((current) => !current);
  }, []);

  const isAssignmentBusyForSelected =
    selectedJob !== null && pendingJobId === selectedJob.id;

  const boardTitle =
    dispatchPageFocus?.boardEyebrow ?? "Today's scheduled jobs";
  const boardSubtitle =
    dispatchPageFocus?.boardDescription ??
    "Technician lanes with horizontally scrollable job cards";

  const openSectionSheet = useMemo(() => {
    if (openSection === "summary") {
      return {
        titleId: "dispatch-summary-section-title",
        title: "Today's overview",
        subtitle: "Status counts for today's dispatch board",
        icon: <BarChart3 className="h-4 w-4" />,
        iconClassName: "bg-blue-50 text-blue-600",
        content: (
          <DispatchSummaryCards
            summary={summary}
            highlightedLabels={dispatchPageFocus?.highlightedSummaryLabels}
            linkToJobs
          />
        ),
      };
    }

    if (openSection === "workload") {
      return {
        titleId: "dispatch-workload-section-title",
        title: "Technician workload",
        subtitle: "Assigned jobs per technician today",
        icon: <Users className="h-4 w-4" />,
        iconClassName: "bg-slate-100 text-slate-700",
        content: (
          <TechnicianWorkloadCards
            technicians={technicians}
            jobs={jobs}
            emphasized={dispatchPageFocus?.emphasizeWorkload}
            highlightedTechnicianIds={dispatchPageFocus?.overloadedTechnicianIds}
            onTechnicianClick={handleTechnicianWorkloadClick}
          />
        ),
      };
    }

    if (openSection === "filters") {
      return {
        titleId: "dispatch-filters-section-title",
        title: "Search & filters",
        subtitle: "Narrow the board without leaving dispatch",
        icon: <SlidersHorizontal className="h-4 w-4" />,
        iconClassName: "bg-cyan-50 text-cyan-700",
        content: (
          <DispatchSearchFilterBar
            search={search}
            statusFilter={statusFilter}
            technicianFilter={technicianFilter}
            technicians={technicians}
            onSearchChange={setSearch}
            onStatusFilterChange={setStatusFilter}
            onTechnicianFilterChange={setTechnicianFilter}
            resultCount={filteredJobs.length}
            unassignedCount={unassignedJobs.length}
            onOpenUnassigned={handleOpenUnassigned}
          />
        ),
      };
    }

    return null;
  }, [
    dispatchPageFocus?.emphasizeWorkload,
    dispatchPageFocus?.highlightedSummaryLabels,
    dispatchPageFocus?.overloadedTechnicianIds,
    filteredJobs.length,
    handleOpenUnassigned,
    jobs,
    openSection,
    search,
    statusFilter,
    summary,
    technicianFilter,
    technicians,
    handleTechnicianWorkloadClick,
    unassignedJobs.length,
  ]);

  return (
    <div className="flex min-h-0 min-w-0 max-w-full flex-col gap-2 sm:gap-4 lg:h-[calc(100dvh-7rem)] lg:overflow-hidden">
      <DispatchDashboardHeader
        jobCount={jobs.length}
        technicianCount={technicians.length}
      />

      {dispatchPageFocus?.banner ? (
        <DispatchFocusBanner
          title={dispatchPageFocus.banner.title}
          description={dispatchPageFocus.banner.description}
          clearHref={dispatchPageFocus.banner.clearHref}
        />
      ) : null}

      <DispatchSectionActions
        openSection={openSection}
        onOpenSection={handleOpenSection}
        hasJobs={!hasNoJobs}
        filtersActive={filtersActive}
        unassignedCount={unassignedJobs.length}
        dispatchPageFocus={dispatchPageFocus}
      />

      {!hasNoJobs && !isBelowLg ? (
        <DispatchSearchFilterBar
          search={search}
          statusFilter={statusFilter}
          technicianFilter={technicianFilter}
          technicians={technicians}
          onSearchChange={setSearch}
          onStatusFilterChange={setStatusFilter}
          onTechnicianFilterChange={setTechnicianFilter}
          resultCount={filteredJobs.length}
          unassignedCount={unassignedJobs.length}
          onOpenUnassigned={handleOpenUnassigned}
          compact
        />
      ) : null}

      <div className="flex min-h-0 min-w-0 max-w-full flex-1 flex-col gap-2 sm:gap-4 lg:flex-row lg:items-stretch">
        <section
          className={`admin-panel flex min-h-0 min-w-0 max-w-full flex-1 flex-col overflow-hidden ${
            dispatchPageFocus?.emphasizeBoard
              ? "ring-1 ring-cyan-500/20"
              : ""
          }`}
        >
          <div className="admin-panel-header flex shrink-0 flex-wrap items-start justify-between gap-2 px-3 py-2 sm:px-4 sm:py-3">
            <div className="min-w-0">
              <h2 className="admin-heading-section sm:text-base">
                {boardTitle}
              </h2>
              <p className="admin-text-helper mt-0.5 hidden sm:block">
                {boardSubtitle}
              </p>
            </div>
            {unassignedJobs.length > 0 ? (
              <button
                type="button"
                onClick={handleOpenUnassigned}
                className="inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-lg border border-amber-200/80 bg-amber-50/80 px-2.5 py-1.5 text-xs font-semibold text-amber-900 transition-colors hover:bg-amber-100/80"
              >
                Unassigned
                <span className="rounded-full bg-amber-200/70 px-1.5 py-0.5 text-[10px] font-bold tabular-nums">
                  {unassignedJobs.length}
                </span>
              </button>
            ) : null}
          </div>

          <div className="min-h-0 min-w-0 max-w-full flex-1 overflow-y-auto overscroll-contain bg-white p-2 sm:p-3">
            {hasNoJobs ? (
              <DispatchEmptyState
                variant="no-jobs"
                canDispatchJobs={canDispatchJobs}
              />
            ) : hasNoResults ? (
              <DispatchEmptyState variant="no-results" />
            ) : (
              <DispatchBoard
                jobs={filteredJobs}
                technicians={technicians}
                technicianFilter={technicianFilter}
                selectedJobId={selectedJobId}
                pendingJobId={pendingJobId}
                hideEmptyTechnicianLanes
                showAllTechnicians={showAllTechnicians}
                onSelectJob={handleSelectJob}
                onToggleShowAllTechnicians={handleToggleShowAllTechnicians}
                highlightUnassignedPanel={
                  dispatchPageFocus?.highlightUnassignedPanel ?? false
                }
              />
            )}
          </div>
        </section>

        {selectedJob ? (
          <div className="hidden lg:flex lg:h-full lg:min-h-0 lg:w-[380px] lg:shrink-0 lg:flex-col lg:overflow-hidden">
            <DispatchDetailsPanel
              job={selectedJob}
              technician={selectedTechnician}
              technicians={technicians}
              canDispatchJobs={canDispatchJobs}
              canUpdateJobWorkflow={canUpdateJobWorkflow(selectedJob)}
              canViewBilling={canViewBilling}
              aiFeaturesEnabled={aiFeaturesEnabled}
              billingContext={{
                estimates:
                  billingSummaries.estimatesByJobId[selectedJob.id] ?? [],
                invoices:
                  billingSummaries.invoicesByJobId[selectedJob.id] ?? [],
              }}
              assignError={assignError}
              assignSuccess={assignSuccess}
              isAssignmentBusy={isAssignmentBusyForSelected}
              lockBodyScroll={false}
              onClose={handleClosePanel}
              onAssign={handleAssign}
              onUnassign={canDispatchJobs ? handleUnassign : undefined}
              onStatusUpdated={handleStatusUpdated}
            />
          </div>
        ) : null}
      </div>

      {openSectionSheet ? (
        <DispatchSectionSheet
          open
          onClose={handleCloseSection}
          titleId={openSectionSheet.titleId}
          title={openSectionSheet.title}
          subtitle={openSectionSheet.subtitle}
          icon={openSectionSheet.icon}
          iconClassName={openSectionSheet.iconClassName}
        >
          {openSectionSheet.content}
        </DispatchSectionSheet>
      ) : null}

      {showUnassignedModal ? (
        <UnassignedJobsModal
          jobs={unassignedJobs}
          selectedJobId={selectedJobId}
          onSelectJob={handleSelectJob}
          onClose={handleCloseUnassignedModal}
        />
      ) : null}

      {selectedJob && isBelowLg ? (
        <MobileSheet
          onClose={handleClosePanel}
          closeDisabled={isAssignmentBusyForSelected}
          ariaLabelledBy="dispatch-job-modal-title"
          variant="responsive"
          zIndex={50}
        >
          <MobileSheetPanel maxWidth="lg" maxHeight="90" unstyled className="min-h-0">
            <DispatchDetailsPanel
              job={selectedJob}
              technician={selectedTechnician}
              technicians={technicians}
              canDispatchJobs={canDispatchJobs}
              canUpdateJobWorkflow={canUpdateJobWorkflow(selectedJob)}
              canViewBilling={canViewBilling}
              aiFeaturesEnabled={aiFeaturesEnabled}
              billingContext={{
                estimates:
                  billingSummaries.estimatesByJobId[selectedJob.id] ?? [],
                invoices:
                  billingSummaries.invoicesByJobId[selectedJob.id] ?? [],
              }}
              assignError={assignError}
              assignSuccess={assignSuccess}
              isAssignmentBusy={isAssignmentBusyForSelected}
              lockBodyScroll={false}
              onClose={handleClosePanel}
              onAssign={handleAssign}
              onUnassign={canDispatchJobs ? handleUnassign : undefined}
              onStatusUpdated={handleStatusUpdated}
            />
          </MobileSheetPanel>
        </MobileSheet>
      ) : null}
    </div>
  );
}
