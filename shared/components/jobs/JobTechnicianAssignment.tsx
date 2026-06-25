"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { User, UserMinus, UserPlus } from "lucide-react";
import { assignJobAction, unassignJobAction } from "@/app/actions/dispatch";
import {
  canUnassignJobTechnician,
  hasAssignedJobTechnician,
  type DispatchJobStatus,
  type Technician,
} from "@/shared/types/dispatch";
import { northStarDetailTokens as dt } from "@/shared/design-system/north-star/tokens";

type JobTechnicianAssignmentProps = {
  jobId: string;
  jobStatus: DispatchJobStatus;
  assignedTechnicianId?: string;
  assignedTechnician?: string;
  technicians: Technician[];
  canAssign: boolean;
  northStar?: boolean;
  compact?: boolean;
};

export function JobTechnicianAssignment({
  jobId,
  jobStatus,
  assignedTechnicianId,
  assignedTechnician,
  technicians,
  canAssign,
  northStar = false,
  compact = false,
}: JobTechnicianAssignmentProps) {
  const router = useRouter();
  const [selectedTechnicianId, setSelectedTechnicianId] = useState(
    assignedTechnicianId ?? "",
  );
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<"assign" | "unassign" | null>(
    null,
  );
  const [isPending, startTransition] = useTransition();
  const isAssigned = hasAssignedJobTechnician({ assignedTechnicianId });
  const showUnassign = canUnassignJobTechnician(
    { assignedTechnicianId, status: jobStatus },
    canAssign,
  );
  const hasSelectionChanged =
    Boolean(selectedTechnicianId) && selectedTechnicianId !== assignedTechnicianId;

  useEffect(() => {
    setSelectedTechnicianId(assignedTechnicianId ?? "");
    setError(null);
    setSuccessMessage(null);
  }, [assignedTechnicianId, jobId]);

  function handleUnassign() {
    if (!showUnassign || isPending) {
      return;
    }

    setError(null);
    setSuccessMessage(null);
    setPendingAction("unassign");

    startTransition(async () => {
      try {
        const result = await unassignJobAction(jobId);

        if (result.error) {
          setError(result.error);
          return;
        }

        setSelectedTechnicianId("");
        setSuccessMessage("Technician unassigned.");
        router.refresh();
      } finally {
        setPendingAction(null);
      }
    });
  }

  function handleAssign() {
    if (!selectedTechnicianId || !hasSelectionChanged || isPending) {
      return;
    }

    setError(null);
    setSuccessMessage(null);
    setPendingAction("assign");

    startTransition(async () => {
      try {
        const result = await assignJobAction(jobId, selectedTechnicianId);

        if (result.error) {
          setError(result.error);
          return;
        }

        const assignedName =
          technicians.find((technician) => technician.id === selectedTechnicianId)
            ?.name ?? "Technician";
        setSuccessMessage(`Assigned to ${assignedName}.`);
        router.refresh();
      } finally {
        setPendingAction(null);
      }
    });
  }

  const assignedMember = technicians.find(
    (technician) => technician.id === assignedTechnicianId,
  );

  return (
    <div className={compact ? "space-y-2.5" : "space-y-4"}>
      {isAssigned ? (
        <div
          className={
            northStar
              ? `${dt.innerCard} border-[rgba(16,185,129,0.18)] bg-[rgba(236,253,245,0.65)]`
              : "rounded-xl border border-emerald-100 bg-emerald-50/60 p-4"
          }
        >
          <div className="flex items-center gap-3">
            <div
              className={
                northStar
                  ? "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[rgba(16,185,129,0.12)] text-xs font-bold text-emerald-900"
                  : "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-sm font-bold text-emerald-800"
              }
            >
              {assignedMember?.initials ??
                assignedTechnician?.slice(0, 2).toUpperCase() ??
                "?"}
            </div>
            <div>
              <p
                className={
                  northStar
                    ? "text-sm font-semibold text-[#17130E]"
                    : "text-sm font-semibold text-emerald-950"
                }
              >
                {assignedTechnician ?? assignedMember?.name ?? "Assigned"}
              </p>
              <p
                className={
                  northStar ? "text-xs text-[#4F4638]" : "text-xs text-emerald-700"
                }
              >
                {assignedMember?.role ?? "Team member"}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div
          className={
            northStar
              ? `${dt.innerCard} border-[rgba(245,158,11,0.22)] bg-[rgba(254,243,199,0.45)] px-2.5 py-2 text-xs font-medium text-[#92400E]`
              : "flex items-center gap-2 rounded-xl border border-amber-100 bg-amber-50/60 px-4 py-3 text-sm text-amber-800"
          }
        >
          {!northStar ? <User className="h-4 w-4 shrink-0" /> : null}
          Unassigned — no technician has been assigned yet
        </div>
      )}

      {showUnassign ? (
        <button
          type="button"
          onClick={handleUnassign}
          disabled={isPending}
          className={
            northStar
              ? `${dt.secondaryAction} w-full justify-center`
              : "inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          }
        >
          <UserMinus className="h-4 w-4" />
          {pendingAction === "unassign" && isPending
            ? "Unassigning..."
            : "Unassign technician"}
        </button>
      ) : null}

      {canAssign ? (
        technicians.length > 0 ? (
          <div className="space-y-2">
            <label
              htmlFor={`assign-technician-${jobId}`}
              className={
                northStar
                  ? dt.metricLabel
                  : "text-xs font-semibold uppercase tracking-wide text-slate-500"
              }
            >
              {isAssigned ? "Change assignment" : "Assign technician"}
            </label>
            <select
              id={`assign-technician-${jobId}`}
              value={selectedTechnicianId}
              onChange={(event) => setSelectedTechnicianId(event.target.value)}
              disabled={isPending}
              className={
                northStar
                  ? "w-full rounded-lg border border-[rgba(138,99,36,0.18)] bg-[#FFF9EA] px-3 py-2 text-sm text-[#17130E] outline-none focus:border-[#B88A2E] focus:ring-2 focus:ring-[rgba(201,164,77,0.22)] disabled:opacity-60"
                  : "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 disabled:opacity-60"
              }
            >
              <option value="">Select a team member</option>
              {technicians.map((technician) => (
                <option key={technician.id} value={technician.id}>
                  {technician.name}
                  {technician.role ? ` (${technician.role})` : ""}
                </option>
              ))}
            </select>
            {error ? (
              <p className="break-words text-xs text-red-600" role="alert">
                {error}
              </p>
            ) : null}
            {successMessage ? (
              <p className="text-xs text-emerald-700">{successMessage}</p>
            ) : null}
            <button
              type="button"
              onClick={handleAssign}
              disabled={!hasSelectionChanged || isPending}
              className={
                northStar
                  ? `${dt.primaryAction} w-full justify-center`
                  : "inline-flex min-h-11 items-center gap-2 rounded-lg bg-cyan-600 px-3.5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-cyan-700 disabled:cursor-not-allowed disabled:opacity-60"
              }
            >
              <UserPlus className="h-4 w-4" />
              {pendingAction === "assign" && isPending
                ? "Saving..."
                : isAssigned
                  ? "Change technician"
                  : "Assign technician"}
            </button>
          </div>
        ) : (
          <p className={northStar ? "text-sm text-[#64748B]" : "text-sm text-slate-500"}>
            No team members are available to assign. Add active company members
            to enable assignments.
          </p>
        )
      ) : (
        <p className={northStar ? "text-sm text-[#64748B]" : "text-sm text-slate-500"}>
          You do not have permission to assign technicians to this job.
        </p>
      )}
    </div>
  );
}
