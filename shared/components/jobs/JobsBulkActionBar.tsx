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
import { jobMissionClasses as jm } from "./job-list-presentation";

type JobsBulkActionBarProps = {
  selectedJobs: Job[];
  technicians: Technician[];
  isAssigning: boolean;
  isUpdatingStatus: boolean;
  onAssign: (technicianId: string) => void;
  onUpdateStatus: (actionId: JobWorkflowActionId) => void;
  onClearSelection: () => void;
  /** @deprecated Mission Control unifies presentation; retained for call-site compatibility. */
  northStar?: boolean;
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
    }

    onUpdateStatus(selectedActionId);
  }

  return (
    <div
      className={jm.bulkBar}
      role="region"
      aria-label="Bulk job actions"
    >
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <p className={jm.bulkBarTitle}>{selectedCount} selected</p>
          <button
            type="button"
            onClick={onClearSelection}
            disabled={isBusy}
            className={jm.bulkClearButton}
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
                className={jm.bulkFieldLabel}
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
                  className={jm.bulkSelect}
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
                  className={jm.bulkPrimaryAction}
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
              <label htmlFor="bulk-status-action" className={jm.bulkFieldLabel}>
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
                  className={jm.bulkSelect}
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
                  className={jm.bulkSecondaryAction}
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
