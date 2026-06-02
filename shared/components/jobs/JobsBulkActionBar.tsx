"use client";

import { Loader2, UserPlus, X } from "lucide-react";
import { useMemo, useState } from "react";
import {
  isBulkStatusActionDestructive,
  resolveBulkStatusActionOptions,
} from "@/shared/lib/jobs-bulk-actions";
import type { Job } from "@/shared/types/job";
import type { JobWorkflowActionId } from "@/shared/types/job-workflow";
import type { Technician } from "@/shared/types/dispatch";

type JobsBulkActionBarProps = {
  selectedJobs: Job[];
  technicians: Technician[];
  isAssigning: boolean;
  isUpdatingStatus: boolean;
  onAssign: (technicianId: string) => void;
  onUpdateStatus: (actionId: JobWorkflowActionId) => void;
  onClearSelection: () => void;
};

export function JobsBulkActionBar({
  selectedJobs,
  technicians,
  isAssigning,
  isUpdatingStatus,
  onAssign,
  onUpdateStatus,
  onClearSelection,
}: JobsBulkActionBarProps) {
  const [selectedTechnicianId, setSelectedTechnicianId] = useState("");
  const [selectedActionId, setSelectedActionId] = useState<
    JobWorkflowActionId | ""
  >("");

  const selectedCount = selectedJobs.length;
  const isBusy = isAssigning || isUpdatingStatus;

  const statusActionOptions = useMemo(
    () => resolveBulkStatusActionOptions(selectedJobs),
    [selectedJobs],
  );

  if (selectedCount === 0) {
    return null;
  }

  function handleAssignClick() {
    if (!selectedTechnicianId || isBusy) {
      return;
    }

    onAssign(selectedTechnicianId);
  }

  function handleStatusClick() {
    if (!selectedActionId || isBusy) {
      return;
    }

    if (isBulkStatusActionDestructive(selectedActionId)) {
      const confirmed = window.confirm(
        `Cancel ${selectedCount} selected job${
          selectedCount === 1 ? "" : "s"
        }? This cannot be undone from the bulk action bar.`,
      );

      if (!confirmed) {
        return;
      }

      onUpdateStatus(selectedActionId);
      return;
    }

    onUpdateStatus(selectedActionId);
  }

  return (
    <div
      className="sticky bottom-0 z-20 border-t border-cyan-200 bg-cyan-50/95 px-3 py-3 shadow-[0_-8px_24px_-12px_rgba(15,23,42,0.25)] backdrop-blur-sm sm:px-4"
      role="region"
      aria-label="Bulk job actions"
    >
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-bold text-cyan-950">
            {selectedCount} selected
          </p>
          <button
            type="button"
            onClick={onClearSelection}
            disabled={isBusy}
            className="inline-flex min-h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg border border-cyan-200 bg-white px-3 py-1.5 text-xs font-semibold text-cyan-900 transition-colors hover:border-cyan-300 hover:bg-cyan-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
            Clear selection
          </button>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end">
          {technicians.length > 0 ? (
            <div className="flex min-w-0 flex-1 flex-col gap-1 sm:max-w-xs">
              <label
                htmlFor="bulk-assign-technician"
                className="text-[11px] font-semibold uppercase tracking-wide text-cyan-900/70"
              >
                Assign technician
              </label>
              <div className="flex gap-2">
                <select
                  id="bulk-assign-technician"
                  value={selectedTechnicianId}
                  onChange={(event) =>
                    setSelectedTechnicianId(event.target.value)
                  }
                  disabled={isBusy}
                  className="min-w-0 flex-1 rounded-lg border border-cyan-200 bg-white px-2.5 py-2 text-sm text-slate-900 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 disabled:opacity-60"
                >
                  <option value="">Select team member</option>
                  {technicians.map((technician) => (
                    <option key={technician.id} value={technician.id}>
                      {technician.name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={handleAssignClick}
                  disabled={!selectedTechnicianId || isBusy}
                  className="inline-flex min-h-10 shrink-0 items-center justify-center gap-1.5 rounded-lg border border-cyan-600 bg-cyan-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:border-cyan-700 hover:bg-cyan-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isAssigning ? (
                    <Loader2
                      className="h-3.5 w-3.5 animate-spin"
                      aria-hidden="true"
                    />
                  ) : (
                    <UserPlus className="h-3.5 w-3.5" aria-hidden="true" />
                  )}
                  {isAssigning ? "Assigning…" : "Assign"}
                </button>
              </div>
            </div>
          ) : null}

          {statusActionOptions.length > 0 ? (
            <div className="flex min-w-0 flex-1 flex-col gap-1 sm:max-w-xs">
              <label
                htmlFor="bulk-status-action"
                className="text-[11px] font-semibold uppercase tracking-wide text-cyan-900/70"
              >
                Change status
              </label>
              <div className="flex gap-2">
                <select
                  id="bulk-status-action"
                  value={selectedActionId}
                  onChange={(event) =>
                    setSelectedActionId(
                      event.target.value as JobWorkflowActionId | "",
                    )
                  }
                  disabled={isBusy}
                  className="min-w-0 flex-1 rounded-lg border border-cyan-200 bg-white px-2.5 py-2 text-sm text-slate-900 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 disabled:opacity-60"
                >
                  <option value="">Select action</option>
                  {statusActionOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={handleStatusClick}
                  disabled={!selectedActionId || isBusy}
                  className="inline-flex min-h-10 shrink-0 items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isUpdatingStatus ? (
                    <Loader2
                      className="h-3.5 w-3.5 animate-spin"
                      aria-hidden="true"
                    />
                  ) : null}
                  {isUpdatingStatus ? "Applying…" : "Apply"}
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
