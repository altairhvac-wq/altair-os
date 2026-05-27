"use client";

import { useEffect } from "react";
import { Inbox, X } from "lucide-react";
import type { DispatchJob } from "@/shared/types/dispatch";
import { DispatchJobCard } from "./DispatchJobCard";

type UnassignedJobsModalProps = {
  jobs: DispatchJob[];
  selectedJobId: string | null;
  onSelectJob: (job: DispatchJob) => void;
  onClose: () => void;
};

export function UnassignedJobsModal({
  jobs,
  selectedJobId,
  onSelectJob,
  onClose,
}: UnassignedJobsModalProps) {
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-40 flex items-end justify-center p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="unassigned-jobs-modal-title"
    >
      <button
        type="button"
        aria-label="Close unassigned jobs"
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/40"
      />
      <div className="relative z-10 flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl border border-amber-200/80 bg-white shadow-xl sm:max-h-[80vh] sm:rounded-2xl">
        <header className="flex shrink-0 items-center gap-3 border-b border-amber-200/80 bg-amber-50/40 px-4 py-3.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
            <Inbox className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <h2
              id="unassigned-jobs-modal-title"
              className="text-sm font-bold text-slate-900"
            >
              Unassigned Jobs
            </h2>
            <p className="text-xs text-slate-500">
              {jobs.length} {jobs.length === 1 ? "job" : "jobs"} need assignment
            </p>
          </div>
          <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-800">
            {jobs.length}
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-4">
          {jobs.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-amber-200 bg-amber-50/30 px-4 py-10 text-center">
              <p className="text-sm font-medium text-slate-600">
                No unassigned jobs match your filters
              </p>
              <p className="mt-1 text-xs text-slate-400">
                Adjust search or filters to see the queue
              </p>
            </div>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {jobs.map((job) => (
                <DispatchJobCard
                  key={job.id}
                  job={job}
                  compact
                  isSelected={selectedJobId === job.id}
                  onSelect={onSelectJob}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
