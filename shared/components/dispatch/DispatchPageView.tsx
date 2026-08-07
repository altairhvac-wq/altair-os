"use client";

import { useMemo, useState, useTransition, useCallback, useEffect, useRef } from "react";
import { assignJobAction, unassignJobAction } from "@/app/actions/dispatch";
import {
  filterDispatchJobs,
  getDispatchBoardMetrics,
  hasAssignedJobTechnician,
  type DispatchJob,
  type DispatchJobStatus,
  type Technician,
} from "@/shared/types/dispatch";
import type { DispatchPageFocusState } from "@/shared/lib/dispatch-page-focus";
import { isAssignableTechnician } from "@/shared/lib/dispatch-recommendations";
import type { JobBillingSummariesByJobId } from "@/shared/lib/job-next-business-action";
import { formatDateInTimeZone } from "@/shared/lib/datetime";
import { canUpdateJobWorkflowStatus } from "@/lib/database/access-control";
import { useIsBelowLg } from "@/shared/components/mobile/use-mobile-viewport";
import { DispatchBoard } from "./DispatchBoard";
import { DispatchDetailsPanel } from "./DispatchDetailsPanel";
import { MobileSheet, MobileSheetPanel } from "@/shared/components/ui/mobile-sheet";
import { DispatchEmptyState } from "./DispatchEmptyState";
import { DispatchFocusBanner } from "./DispatchFocusBanner";
import { DispatchStatStrip } from "./DispatchStatStrip";
import { dispatchMissionClasses as dm } from "./dispatch-board-presentation";
import {
  MasterContentStack,
  MasterPageCanvas,
  MasterShellPage,
  masterWorkbenchRowClass,
} from "@/shared/design-system/shell";

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
  /** Operational day shown on the board (`YYYY-MM-DD` in company timezone). */
  boardDateOnly?: string;
  isBoardToday?: boolean;
  timeZone?: string;
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
  boardDateOnly,
  isBoardToday = true,
  timeZone,
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

  /** Deep-link focus can still scope the board (e.g. unassigned); no UI filter bar. */
  const technicianFilter =
    dispatchPageFocus?.initialTechnicianFilter ?? "all";
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [assignFeedback, setAssignFeedback] = useState<{
    jobId: string;
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [pendingJobId, setPendingJobId] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const isBelowLg = useIsBelowLg();

  /** Board lanes + assign dropdown — Technician role only (not Owner/Dispatcher/Office). */
  const assignableTechnicians = useMemo(
    () => technicians.filter(isAssignableTechnician),
    [technicians],
  );

  const filteredJobs = useMemo(
    () =>
      filterDispatchJobs(
        jobs,
        technicians,
        "",
        "all",
        technicianFilter,
      ),
    [jobs, technicians, technicianFilter],
  );

  const boardMetrics = useMemo(() => getDispatchBoardMetrics(jobs), [jobs]);

  const selectedJob = jobs.find((job) => job.id === selectedJobId) ?? null;
  const selectedTechnician = selectedJob?.technicianId
    ? (technicians.find((tech) => tech.id === selectedJob.technicianId) ??
      null)
    : null;

  const handleSelectJob = useCallback((job: DispatchJob) => {
    setSelectedJobId(job.id);
    setAssignFeedback(null);
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

  const defaultBoardTitle =
    isBoardToday || !boardDateOnly
      ? "Today's operations board"
      : `Operations board · ${formatDateInTimeZone(boardDateOnly, timeZone, {
          weekday: "short",
          month: "short",
          day: "numeric",
        })}`;
  const boardTitle =
    dispatchPageFocus?.boardEyebrow ?? defaultBoardTitle;
  const boardSubtitle =
    dispatchPageFocus?.boardDescription ??
    "Map pins · technician rows · unassigned queue on the left";

  const boardEmphasisClass = dispatchPageFocus?.emphasizeBoard
    ? dm.boardEmphasisRing
    : "";

  const detailsPanel = selectedJob ? (
    <DispatchDetailsPanel
      job={selectedJob}
      technician={selectedTechnician}
      technicians={assignableTechnicians}
      canDispatchJobs={canDispatchJobs}
      canUpdateJobWorkflow={canUpdateJobWorkflow(selectedJob)}
      canManageCustomers={canManageCustomers}
      canViewBilling={canViewBilling}
      aiFeaturesEnabled={aiFeaturesEnabled}
      billingContext={{
        estimates: billingSummaries.estimatesByJobId[selectedJob.id] ?? [],
        invoices: billingSummaries.invoicesByJobId[selectedJob.id] ?? [],
      }}
      assignError={selectedAssignError}
      assignSuccess={selectedAssignSuccess}
      isAssignmentBusy={isAssignmentBusyForSelected}
      isOtherAssignmentPending={isOtherAssignmentPending}
      lockBodyScroll={false}
      onClose={handleClosePanel}
      onAssign={handleAssign}
      onUnassign={canDispatchJobs ? handleUnassign : undefined}
      onStatusUpdated={handleStatusUpdated}
    />
  ) : null;

  return (
    <MasterShellPage
      fillViewport
      density="compact"
      className="h-[calc(100dvh-7rem)] min-h-0 overflow-hidden max-md:h-auto max-md:min-h-0 max-md:overflow-visible"
      data-testid="page-dispatch"
    >
      <MasterPageCanvas width="wide" className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden max-md:overflow-visible">
        <div
          className={`${dm.pageCanvas} flex min-h-0 min-w-0 max-w-full flex-1 flex-col overflow-hidden p-2 max-md:overflow-visible sm:p-3`}
        >
          <MasterContentStack
            density="compact"
            scrollable
            className="min-h-0 min-w-0 max-w-full flex-1 overflow-hidden max-md:overflow-visible"
          >
            <div
              className={`${masterWorkbenchRowClass} min-h-0 flex-1 overflow-hidden max-md:flex-none max-md:overflow-visible`}
            >
              <div
                className={`${dm.boardSurface} max-w-full ${boardEmphasisClass}`}
              >
                <div className={dm.boardHeader}>
                  <div className="min-w-0">
                    <h1 className={dm.boardHeaderTitle}>{boardTitle}</h1>
                    <p className={dm.boardHeaderSubtitle}>{boardSubtitle}</p>
                  </div>
                  <DispatchStatStrip metrics={boardMetrics} />
                </div>

                {dispatchPageFocus?.banner ? (
                  <div className="shrink-0 px-3 pt-2 sm:px-4">
                    <DispatchFocusBanner
                      title={dispatchPageFocus.banner.title}
                      description={dispatchPageFocus.banner.description}
                      clearHref={dispatchPageFocus.banner.clearHref}
                    />
                  </div>
                ) : null}

                <div className={dm.boardBody}>
                  {hasNoJobs ? (
                    <DispatchEmptyState
                      variant="no-jobs"
                      canDispatchJobs={canDispatchJobs}
                    />
                  ) : hasNoResults && technicianFilter !== "unassigned" ? (
                    <DispatchEmptyState variant="no-results" />
                  ) : (
                    <DispatchBoard
                      jobs={filteredJobs}
                      technicians={assignableTechnicians}
                      technicianFilter={technicianFilter}
                      selectedJobId={selectedJobId}
                      pendingJobId={pendingJobId}
                      onSelectJob={handleSelectJob}
                      highlightUnassignedPanel={
                        dispatchPageFocus?.highlightUnassignedPanel ?? false
                      }
                      overloadedTechnicianIds={
                        dispatchPageFocus?.overloadedTechnicianIds ?? []
                      }
                      focusTechnicianId={
                        dispatchPageFocus?.focusTechnicianId ?? null
                      }
                    />
                  )}
                </div>
              </div>

              {selectedJob ? (
                <div className="hidden lg:flex lg:h-full lg:min-h-0 lg:w-[380px] lg:shrink-0 lg:flex-col lg:overflow-hidden">
                  {detailsPanel}
                </div>
              ) : null}
            </div>
          </MasterContentStack>
        </div>
      </MasterPageCanvas>

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
            className="flex h-[90dvh] max-h-[90dvh] min-h-0 flex-col sm:h-auto"
          >
            <div className="flex min-h-0 flex-1 flex-col">{detailsPanel}</div>
          </MobileSheetPanel>
        </MobileSheet>
      ) : null}
    </MasterShellPage>
  );
}
