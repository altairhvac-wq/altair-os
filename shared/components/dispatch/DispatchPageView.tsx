"use client";

import { useEffect, useMemo, useState } from "react";
import { mockDispatchJobs } from "@/shared/data/mock-dispatch-jobs";
import { mockTechnicians } from "@/shared/data/mock-technicians";
import {
  filterDispatchJobs,
  getDispatchSummary,
  type DispatchJob,
  type DispatchJobStatus,
} from "@/shared/types/dispatch";
import { DispatchBoard } from "./DispatchBoard";
import { DispatchDetailsPanel } from "./DispatchDetailsPanel";
import { DispatchEmptyState } from "./DispatchEmptyState";
import { DispatchLoadingState } from "./DispatchLoadingState";
import { DispatchSearchFilterBar } from "./DispatchSearchFilterBar";
import { DispatchSummaryCards } from "./DispatchSummaryCards";

export function DispatchPageView() {
  const [jobs, setJobs] = useState<DispatchJob[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<DispatchJobStatus | "all">(
    "all",
  );
  const [technicianFilter, setTechnicianFilter] = useState("all");
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setJobs(mockDispatchJobs);
      setIsLoading(false);
    }, 600);

    return () => clearTimeout(timer);
  }, []);

  const filteredJobs = useMemo(
    () =>
      filterDispatchJobs(
        jobs,
        mockTechnicians,
        search,
        statusFilter,
        technicianFilter,
      ),
    [jobs, search, statusFilter, technicianFilter],
  );

  const summary = useMemo(() => getDispatchSummary(jobs), [jobs]);

  const selectedJob = jobs.find((job) => job.id === selectedJobId) ?? null;
  const selectedTechnician = selectedJob?.technicianId
    ? (mockTechnicians.find((tech) => tech.id === selectedJob.technicianId) ??
      null)
    : null;

  function handleSelectJob(job: DispatchJob) {
    setSelectedJobId(job.id);
  }

  function handleClosePanel() {
    setSelectedJobId(null);
  }

  if (isLoading) {
    return <DispatchLoadingState />;
  }

  const hasNoResults = filteredJobs.length === 0;

  return (
    <div className="flex h-[calc(100vh-7rem)] flex-col gap-4 overflow-hidden">
      <DispatchSummaryCards summary={summary} />

      <DispatchSearchFilterBar
        search={search}
        statusFilter={statusFilter}
        technicianFilter={technicianFilter}
        technicians={mockTechnicians}
        onSearchChange={setSearch}
        onStatusFilterChange={setStatusFilter}
        onTechnicianFilterChange={setTechnicianFilter}
        resultCount={filteredJobs.length}
      />

      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden lg:flex-row">
        <section className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="shrink-0 border-b border-slate-100 px-4 py-3.5">
            <h2 className="text-base font-bold text-slate-900">
              Dispatch board
            </h2>
            <p className="text-xs text-slate-500">
              Technician lanes and unassigned queue for today&apos;s field ops
            </p>
          </div>

          <div className="min-h-0 flex-1 p-3 sm:p-4">
            {hasNoResults ? (
              <DispatchEmptyState variant="no-results" />
            ) : (
              <DispatchBoard
                jobs={filteredJobs}
                technicians={mockTechnicians}
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
                onClose={handleClosePanel}
              />
            </div>
          </div>
        ) : (
          <DispatchDetailsPanel
            job={null}
            technician={null}
            onClose={handleClosePanel}
          />
        )}
      </div>
    </div>
  );
}
