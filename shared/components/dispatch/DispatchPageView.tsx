"use client";

import { useMemo, useState, useTransition } from "react";
import { assignJobAction } from "@/app/actions/dispatch";
import {
  filterDispatchJobs,
  getDispatchSummary,
  type DispatchJob,
  type DispatchJobStatus,
  type Technician,
} from "@/shared/types/dispatch";
import type { DispatchPageFocusState } from "@/shared/lib/dispatch-page-focus";
import { DispatchBoard } from "./DispatchBoard";
import { DispatchDashboardHeader } from "./DispatchDashboardHeader";
import { DispatchDetailsPanel } from "./DispatchDetailsPanel";
import { DispatchEmptyState } from "./DispatchEmptyState";
import { DispatchFocusBanner } from "./DispatchFocusBanner";
import { DispatchSearchFilterBar } from "./DispatchSearchFilterBar";
import { DispatchSummaryCards } from "./DispatchSummaryCards";
import { TechnicianWorkloadCards } from "./TechnicianWorkloadCards";
import { UnassignedJobsModal } from "./UnassignedJobsModal";

type DispatchPageViewProps = {
  initialJobs: DispatchJob[];
  technicians: Technician[];
  canDispatchJobs: boolean;
  canViewAssignedJobs: boolean;
  dispatchPageFocus?: DispatchPageFocusState;
};

export function DispatchPageView({
  initialJobs,
  technicians,
  canDispatchJobs,
  canViewAssignedJobs,
  dispatchPageFocus,
}: DispatchPageViewProps) {
  const canUpdateJobWorkflow = canDispatchJobs || canViewAssignedJobs;
  const [jobs, setJobs] = useState(initialJobs);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<DispatchJobStatus | "all">(
    "all",
  );
  const [technicianFilter, setTechnicianFilter] = useState<string>(
    dispatchPageFocus?.initialTechnicianFilter ?? "all",
  );
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [showUnassignedModal, setShowUnassignedModal] = useState(false);
  const [assignError, setAssignError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

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

  function handleSelectJob(job: DispatchJob) {
    setSelectedJobId(job.id);
    setAssignError(null);
    setShowUnassignedModal(false);
  }

  function handleClosePanel() {
    setSelectedJobId(null);
    setAssignError(null);
  }

  function handleAssign(jobId: string, technicianId: string) {
    setAssignError(null);

    startTransition(async () => {
      const result = await assignJobAction(jobId, technicianId);

      if (result.error || !result.job) {
        setAssignError(result.error ?? "Failed to assign job.");
        return;
      }

      setJobs((previous) =>
        previous.map((job) => (job.id === result.job!.id ? result.job! : job)),
      );
    });
  }

  function handleStatusUpdated(jobId: string, status: DispatchJobStatus) {
    setJobs((previous) =>
      previous.map((job) => (job.id === jobId ? { ...job, status } : job)),
    );
  }

  const hasNoJobs = jobs.length === 0;
  const hasNoResults = !hasNoJobs && filteredJobs.length === 0;

  const boardTitle =
    dispatchPageFocus?.boardEyebrow ?? "Today's scheduled jobs";
  const boardSubtitle =
    dispatchPageFocus?.boardDescription ??
    "Technician lanes with horizontally scrollable job cards";

  return (
    <div className="flex min-w-0 max-w-full flex-col gap-2 sm:gap-4">
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

      <DispatchSummaryCards
        summary={summary}
        highlightedLabels={dispatchPageFocus?.highlightedSummaryLabels}
      />

      <TechnicianWorkloadCards
        technicians={technicians}
        jobs={jobs}
        emphasized={dispatchPageFocus?.emphasizeWorkload}
        highlightedTechnicianIds={dispatchPageFocus?.overloadedTechnicianIds}
      />

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
          onOpenUnassigned={() => setShowUnassignedModal(true)}
        />
      ) : null}

      <div className="flex min-w-0 max-w-full flex-col gap-2 sm:gap-4 lg:flex-row lg:items-start">
        <section
          className={`flex min-w-0 max-w-full flex-1 flex-col overflow-hidden rounded-2xl border bg-white shadow-sm ${
            dispatchPageFocus?.emphasizeBoard
              ? "border-cyan-200 ring-2 ring-cyan-500/15"
              : "border-slate-200"
          }`}
        >
          <div className="shrink-0 border-b border-slate-100 px-3 py-2 sm:px-4 sm:py-3.5">
            <h2 className="text-sm font-bold text-slate-900 sm:text-base">
              {boardTitle}
            </h2>
            <p className="mt-0.5 text-[11px] text-slate-500 sm:text-xs">
              {boardSubtitle}
            </p>
          </div>

          <div className="min-w-0 max-w-full p-2 sm:p-4">
            {hasNoJobs ? (
              <DispatchEmptyState variant="no-jobs" />
            ) : hasNoResults ? (
              <DispatchEmptyState variant="no-results" />
            ) : (
              <DispatchBoard
                jobs={filteredJobs}
                technicians={technicians}
                technicianFilter={technicianFilter}
                selectedJobId={selectedJobId}
                onSelectJob={handleSelectJob}
                highlightUnassignedPanel={
                  dispatchPageFocus?.highlightUnassignedPanel ?? false
                }
              />
            )}
          </div>
        </section>

        {selectedJob ? (
          <div className="hidden lg:block lg:w-[380px] lg:shrink-0">
            <DispatchDetailsPanel
              job={selectedJob}
              technician={selectedTechnician}
              technicians={technicians}
              canDispatchJobs={canDispatchJobs}
              canUpdateJobWorkflow={canUpdateJobWorkflow}
              assignError={assignError}
              isAssigning={isPending}
              lockBodyScroll={false}
              onClose={handleClosePanel}
              onAssign={handleAssign}
              onStatusUpdated={handleStatusUpdated}
            />
          </div>
        ) : (
          <aside className="hidden lg:flex lg:w-[380px] lg:shrink-0 lg:flex-col lg:overflow-hidden lg:rounded-2xl lg:border lg:border-slate-200 lg:bg-white lg:shadow-sm">
            <div className="shrink-0 border-b border-slate-100 px-5 py-4">
              <h2 className="text-base font-bold text-slate-900">Job details</h2>
              <p className="mt-0.5 text-xs text-slate-500">
                Select a job from the board
              </p>
            </div>
            <div className="flex flex-1 flex-col items-center justify-center px-5 py-10 text-center">
              <p className="max-w-xs text-sm text-slate-500">
                Click a job card to view assignment details and workflow actions.
              </p>
            </div>
          </aside>
        )}
      </div>

      {showUnassignedModal ? (
        <UnassignedJobsModal
          jobs={unassignedJobs}
          selectedJobId={selectedJobId}
          onSelectJob={handleSelectJob}
          onClose={() => setShowUnassignedModal(false)}
        />
      ) : null}

      {selectedJob ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4 lg:hidden"
          role="dialog"
          aria-modal="true"
          aria-labelledby="dispatch-job-modal-title"
        >
          <button
            type="button"
            aria-label="Close job details"
            onClick={handleClosePanel}
            className="absolute inset-0 bg-slate-900/40"
          />
          <div className="relative z-10 flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden">
            <DispatchDetailsPanel
              job={selectedJob}
              technician={selectedTechnician}
              technicians={technicians}
              canDispatchJobs={canDispatchJobs}
              canUpdateJobWorkflow={canUpdateJobWorkflow}
              assignError={assignError}
              isAssigning={isPending}
              onClose={handleClosePanel}
              onAssign={handleAssign}
              onStatusUpdated={handleStatusUpdated}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
