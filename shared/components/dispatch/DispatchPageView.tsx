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
import { DispatchBoard } from "./DispatchBoard";
import { DispatchDashboardHeader } from "./DispatchDashboardHeader";
import { DispatchDetailsPanel } from "./DispatchDetailsPanel";
import { DispatchEmptyState } from "./DispatchEmptyState";
import { DispatchSearchFilterBar } from "./DispatchSearchFilterBar";
import { DispatchSummaryCards } from "./DispatchSummaryCards";
import { TechnicianWorkloadCards } from "./TechnicianWorkloadCards";

type DispatchPageViewProps = {
  initialJobs: DispatchJob[];
  technicians: Technician[];
  canDispatchJobs: boolean;
};

export function DispatchPageView({
  initialJobs,
  technicians,
  canDispatchJobs,
}: DispatchPageViewProps) {
  const [jobs, setJobs] = useState(initialJobs);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<DispatchJobStatus | "all">(
    "all",
  );
  const [technicianFilter, setTechnicianFilter] = useState("all");
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
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

  const selectedJob = jobs.find((job) => job.id === selectedJobId) ?? null;
  const selectedTechnician = selectedJob?.technicianId
    ? (technicians.find((tech) => tech.id === selectedJob.technicianId) ??
      null)
    : null;

  function handleSelectJob(job: DispatchJob) {
    setSelectedJobId(job.id);
    setAssignError(null);
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

  const hasNoJobs = jobs.length === 0;
  const hasNoResults = !hasNoJobs && filteredJobs.length === 0;

  return (
    <div className="flex h-[calc(100vh-7rem)] flex-col gap-4 overflow-hidden">
      <DispatchDashboardHeader
        jobCount={jobs.length}
        technicianCount={technicians.length}
      />

      <DispatchSummaryCards summary={summary} />

      <TechnicianWorkloadCards technicians={technicians} jobs={jobs} />

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
        />
      ) : null}

      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden lg:flex-row">
        <section className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="shrink-0 border-b border-slate-100 px-4 py-3.5">
            <h2 className="text-base font-bold text-slate-900">
              Today&apos;s scheduled jobs
            </h2>
            <p className="text-xs text-slate-500">
              Unassigned queue and assigned technician lanes
            </p>
          </div>

          <div className="min-h-0 flex-1 p-3 sm:p-4">
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
              />
            )}
          </div>
        </section>

        {selectedJob ? (
          <div className="fixed inset-0 z-40 flex items-end lg:static lg:z-auto lg:block">
            <button
              type="button"
              aria-label="Close job details"
              onClick={handleClosePanel}
              className="absolute inset-0 bg-slate-900/40 lg:hidden"
            />
            <div className="relative z-10 max-h-[85vh] w-full overflow-hidden lg:max-h-none lg:w-auto">
              <DispatchDetailsPanel
                job={selectedJob}
                technician={selectedTechnician}
                technicians={technicians}
                canDispatchJobs={canDispatchJobs}
                assignError={assignError}
                isAssigning={isPending}
                onClose={handleClosePanel}
                onAssign={handleAssign}
              />
            </div>
          </div>
        ) : (
          <DispatchDetailsPanel
            job={null}
            technician={null}
            technicians={technicians}
            canDispatchJobs={canDispatchJobs}
            assignError={null}
            isAssigning={false}
            onClose={handleClosePanel}
            onAssign={handleAssign}
          />
        )}
      </div>
    </div>
  );
}
