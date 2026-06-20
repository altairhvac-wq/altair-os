"use client";

import { useMemo, useState, useTransition, useCallback, useEffect, useRef } from "react";
import { assignJobAction, unassignJobAction } from "@/app/actions/dispatch";
import {
  filterDispatchJobs,
  hasAssignedJobTechnician,
  type DispatchJob,
  type DispatchJobStatus,
  type Technician,
} from "@/shared/types/dispatch";
import type { DispatchPageFocusState } from "@/shared/lib/dispatch-page-focus";
import type { JobBillingSummariesByJobId } from "@/shared/lib/job-next-business-action";
import { canUpdateJobWorkflowStatus } from "@/lib/database/access-control";
import { isNorthStarShellEnabled } from "@/lib/beta/north-star-shell";
import { useIsBelowLg } from "@/shared/components/mobile/use-mobile-viewport";
import { DispatchBoard } from "./DispatchBoard";
import { DispatchDashboardHeader } from "./DispatchDashboardHeader";
import { DispatchDetailsPanel } from "./DispatchDetailsPanel";
import { MobileSheet, MobileSheetPanel } from "@/shared/components/ui/mobile-sheet";
import { DispatchEmptyState } from "./DispatchEmptyState";
import { DispatchFocusBanner } from "./DispatchFocusBanner";
import { DispatchSearchFilterBar } from "./DispatchSearchFilterBar";
import { UnassignedJobsModal } from "./UnassignedJobsModal";
import {
  MasterContentStack,
  MasterPageCanvas,
  MasterPageSurface,
  MasterShellPage,
  masterWorkbenchRowClass,
} from "@/shared/design-system/shell";
import { northStarListTokens as lt, northStarDispatchTokens as dt } from "@/shared/design-system/north-star/tokens";

type DispatchPageViewProps = {
  initialJobs: DispatchJob[];
  technicians: Technician[];
  canDispatchJobs: boolean;
  canViewAssignedJobs: boolean;
  canManageCustomers: boolean;
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
  canManageCustomers,
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
  const [showUnassignedModal, setShowUnassignedModal] = useState(false);
  const [assignFeedback, setAssignFeedback] = useState<{
    jobId: string;
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [pendingJobId, setPendingJobId] = useState<string | null>(null);
  const [showAllTechnicians, setShowAllTechnicians] = useState(false);
  const [, startTransition] = useTransition();
  const isBelowLg = useIsBelowLg();
  const northStar = isNorthStarShellEnabled();

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
    setAssignFeedback(null);
    setShowUnassignedModal(false);
  }, []);

  const handleClosePanel = useCallback(() => {
    setSelectedJobId(null);
    setAssignFeedback(null);
  }, []);

  const handleAssign = useCallback(
    (jobId: string, technicianId: string) => {
      if (pendingJobId) {
        return;
      }

      setAssignFeedback(null);
      setPendingJobId(jobId);
      pendingAssignJobIdsRef.current.add(jobId);

      startTransition(async () => {
        try {
          const result = await assignJobAction(jobId, technicianId);

          if (result.error || !result.job) {
            setAssignFeedback({
              jobId,
              type: "error",
              message: result.error ?? "Failed to assign job.",
            });
            return;
          }

          const assignedName =
            technicians.find((technician) => technician.id === technicianId)
              ?.name ?? "Technician";
          setAssignFeedback({
            jobId,
            type: "success",
            message: `Assigned to ${assignedName}.`,
          });

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

      setAssignFeedback(null);
      setPendingJobId(jobId);

      startTransition(async () => {
        try {
          const result = await unassignJobAction(jobId);

          if (result.error || !result.job) {
            setAssignFeedback({
              jobId,
              type: "error",
              message: result.error ?? "Failed to unassign job.",
            });
            return;
          }

          setAssignFeedback({
            jobId,
            type: "success",
            message: "Technician unassigned.",
          });
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

  const handleOpenUnassigned = useCallback(() => {
    setShowUnassignedModal(true);
  }, []);

  const handleCloseUnassignedModal = useCallback(() => {
    setShowUnassignedModal(false);
  }, []);

  const handleToggleShowAllTechnicians = useCallback(() => {
    setShowAllTechnicians((current) => !current);
  }, []);

  const isAssignmentBusyForSelected =
    selectedJob !== null && pendingJobId === selectedJob.id;
  const isOtherAssignmentPending =
    pendingJobId !== null &&
    selectedJob !== null &&
    pendingJobId !== selectedJob.id;

  const selectedAssignError =
    assignFeedback &&
    assignFeedback.jobId === selectedJob?.id &&
    assignFeedback.type === "error"
      ? assignFeedback.message
      : null;
  const selectedAssignSuccess =
    assignFeedback &&
    assignFeedback.jobId === selectedJob?.id &&
    assignFeedback.type === "success"
      ? assignFeedback.message
      : null;

  const boardTitle =
    dispatchPageFocus?.boardEyebrow ?? "Today's scheduled jobs";
  const boardSubtitle =
    dispatchPageFocus?.boardDescription ??
    "Technician lanes with horizontally scrollable job cards";

  const boardEmphasisClass = dispatchPageFocus?.emphasizeBoard
    ? northStar
      ? dt.boardEmphasisRing
      : "ring-1 ring-cyan-500/20"
    : "";

  const dispatchBoardContent = (
    <>
      {northStar ? <div className={dt.boardSurfaceTopAccent} aria-hidden /> : null}
      <div
        className={
          northStar
            ? dt.boardHeader
            : "admin-panel-header flex shrink-0 flex-wrap items-start justify-between gap-2 px-3 py-2 sm:px-4 sm:py-3"
        }
      >
        <div className="min-w-0">
          <h2
            className={
              northStar
                ? dt.boardHeaderTitle
                : "admin-heading-section sm:text-base"
            }
          >
            {boardTitle}
          </h2>
          <p
            className={
              northStar
                ? dt.boardHeaderSubtitle
                : "admin-text-helper mt-0.5 hidden sm:block"
            }
          >
            {boardSubtitle}
          </p>
        </div>
        {unassignedJobs.length > 0 ? (
          <button
            type="button"
            onClick={handleOpenUnassigned}
            className={
              northStar
                ? dt.boardUnassignedButton
                : "admin-panel-action admin-panel-action-warning min-h-9 gap-1.5 px-2.5 py-1.5"
            }
          >
            Unassigned
            <span
              className={
                northStar
                  ? dt.boardUnassignedBadge
                  : "rounded-full bg-amber-200/70 px-1.5 py-0.5 text-[10px] font-bold tabular-nums"
              }
            >
              {unassignedJobs.length}
            </span>
          </button>
        ) : null}
      </div>

      <div
        className={
          northStar
            ? dt.boardBody
            : "min-h-0 min-w-0 max-w-full flex-1 overflow-y-auto overscroll-contain bg-white p-2 sm:p-3"
        }
      >
        {hasNoJobs ? (
          <DispatchEmptyState
            variant="no-jobs"
            canDispatchJobs={canDispatchJobs}
            northStar={northStar}
          />
        ) : hasNoResults ? (
          <DispatchEmptyState variant="no-results" northStar={northStar} />
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
            northStar={northStar}
          />
        )}
      </div>
    </>
  );

  return (
    <MasterShellPage
      fillViewport
      density="compact"
      className={northStar ? `${lt.pageCanvas} ${dt.pageCanvas}` : undefined}
    >
      <MasterPageCanvas width="wide" className="min-h-0 flex-1">
        <MasterContentStack
          density="compact"
          scrollable
          className="min-h-0 min-w-0 max-w-full flex-1 overflow-x-hidden"
        >
          <DispatchDashboardHeader northStar={northStar} />

          {dispatchPageFocus?.banner ? (
            <DispatchFocusBanner
              title={dispatchPageFocus.banner.title}
              description={dispatchPageFocus.banner.description}
              clearHref={dispatchPageFocus.banner.clearHref}
              northStar={northStar}
            />
          ) : null}

          {!hasNoJobs ? (
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
              compact={!isBelowLg}
              northStar={northStar}
            />
          ) : null}

          <div className={masterWorkbenchRowClass}>
        {northStar ? (
          <div
            className={`${dt.boardSurface} max-w-full lg:flex-1 ${boardEmphasisClass}`}
          >
            {dispatchBoardContent}
          </div>
        ) : (
          <MasterPageSurface
            variant="panel"
            className={`max-w-full lg:flex-1 ${boardEmphasisClass}`}
          >
            {dispatchBoardContent}
          </MasterPageSurface>
        )}

        {selectedJob ? (
          <div className="hidden lg:flex lg:h-full lg:min-h-0 lg:w-[380px] lg:shrink-0 lg:flex-col lg:overflow-hidden">
            <DispatchDetailsPanel
              job={selectedJob}
              technician={selectedTechnician}
              technicians={technicians}
              canDispatchJobs={canDispatchJobs}
              canUpdateJobWorkflow={canUpdateJobWorkflow(selectedJob)}
              canManageCustomers={canManageCustomers}
              canViewBilling={canViewBilling}
              aiFeaturesEnabled={aiFeaturesEnabled}
              billingContext={{
                estimates:
                  billingSummaries.estimatesByJobId[selectedJob.id] ?? [],
                invoices:
                  billingSummaries.invoicesByJobId[selectedJob.id] ?? [],
              }}
              assignError={selectedAssignError}
              assignSuccess={selectedAssignSuccess}
              isAssignmentBusy={isAssignmentBusyForSelected}
              isOtherAssignmentPending={isOtherAssignmentPending}
              northStar={northStar}
              lockBodyScroll={false}
              onClose={handleClosePanel}
              onAssign={handleAssign}
              onUnassign={canDispatchJobs ? handleUnassign : undefined}
              onStatusUpdated={handleStatusUpdated}
            />
          </div>
        ) : null}
          </div>
        </MasterContentStack>
      </MasterPageCanvas>

      {showUnassignedModal ? (
        <UnassignedJobsModal
          jobs={unassignedJobs}
          selectedJobId={selectedJobId}
          onSelectJob={handleSelectJob}
          onClose={handleCloseUnassignedModal}
          northStar={northStar}
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
          <MobileSheetPanel
            maxWidth="lg"
            maxHeight="90"
            unstyled
            className={
              northStar
                ? dt.detailMobileSheetPanel
                : "flex h-[90dvh] max-h-[90dvh] min-h-0 flex-col sm:h-auto"
            }
          >
            <div className="flex min-h-0 flex-1 flex-col">
              <DispatchDetailsPanel
              job={selectedJob}
              technician={selectedTechnician}
              technicians={technicians}
              canDispatchJobs={canDispatchJobs}
              canUpdateJobWorkflow={canUpdateJobWorkflow(selectedJob)}
              canManageCustomers={canManageCustomers}
              canViewBilling={canViewBilling}
              aiFeaturesEnabled={aiFeaturesEnabled}
              billingContext={{
                estimates:
                  billingSummaries.estimatesByJobId[selectedJob.id] ?? [],
                invoices:
                  billingSummaries.invoicesByJobId[selectedJob.id] ?? [],
              }}
              assignError={selectedAssignError}
              assignSuccess={selectedAssignSuccess}
              isAssignmentBusy={isAssignmentBusyForSelected}
              isOtherAssignmentPending={isOtherAssignmentPending}
              northStar={northStar}
              lockBodyScroll={false}
              onClose={handleClosePanel}
              onAssign={handleAssign}
              onUnassign={canDispatchJobs ? handleUnassign : undefined}
              onStatusUpdated={handleStatusUpdated}
            />
            </div>
          </MobileSheetPanel>
        </MobileSheet>
      ) : null}
    </MasterShellPage>
  );
}
