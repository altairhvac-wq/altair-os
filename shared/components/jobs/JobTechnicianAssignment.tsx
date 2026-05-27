"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { User, UserPlus } from "lucide-react";
import { assignJobAction } from "@/app/actions/dispatch";
import type { Technician } from "@/shared/types/dispatch";

type JobTechnicianAssignmentProps = {
  jobId: string;
  assignedTechnicianId?: string;
  assignedTechnician?: string;
  technicians: Technician[];
  canAssign: boolean;
};

export function JobTechnicianAssignment({
  jobId,
  assignedTechnicianId,
  assignedTechnician,
  technicians,
  canAssign,
}: JobTechnicianAssignmentProps) {
  const router = useRouter();
  const [selectedTechnicianId, setSelectedTechnicianId] = useState(
    assignedTechnicianId ?? "",
  );
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const isAssigned = Boolean(assignedTechnicianId);
  const hasSelectionChanged =
    Boolean(selectedTechnicianId) && selectedTechnicianId !== assignedTechnicianId;

  useEffect(() => {
    setSelectedTechnicianId(assignedTechnicianId ?? "");
    setError(null);
    setSuccessMessage(null);
  }, [assignedTechnicianId, jobId]);

  function handleAssign() {
    if (!selectedTechnicianId || !hasSelectionChanged) {
      return;
    }

    setError(null);
    setSuccessMessage(null);

    startTransition(async () => {
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
    });
  }

  const assignedMember = technicians.find(
    (technician) => technician.id === assignedTechnicianId,
  );

  return (
    <div className="space-y-4">
      {isAssigned ? (
        <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-sm font-bold text-emerald-800">
              {assignedMember?.initials ??
                assignedTechnician?.slice(0, 2).toUpperCase() ??
                "?"}
            </div>
            <div>
              <p className="text-sm font-semibold text-emerald-950">
                {assignedTechnician ?? assignedMember?.name ?? "Assigned"}
              </p>
              <p className="text-xs text-emerald-700">
                {assignedMember?.role ?? "Team member"}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-2 rounded-xl border border-amber-100 bg-amber-50/60 px-4 py-3 text-sm text-amber-800">
          <User className="h-4 w-4 shrink-0" />
          Unassigned — no technician has been assigned yet
        </div>
      )}

      {canAssign ? (
        technicians.length > 0 ? (
          <div className="space-y-2">
            <label
              htmlFor={`assign-technician-${jobId}`}
              className="text-xs font-semibold uppercase tracking-wide text-slate-500"
            >
              {isAssigned ? "Change assignment" : "Assign technician"}
            </label>
            <select
              id={`assign-technician-${jobId}`}
              value={selectedTechnicianId}
              onChange={(event) => setSelectedTechnicianId(event.target.value)}
              disabled={isPending}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 disabled:opacity-60"
            >
              <option value="">Select a team member</option>
              {technicians.map((technician) => (
                <option key={technician.id} value={technician.id}>
                  {technician.name}
                  {technician.role ? ` (${technician.role})` : ""}
                </option>
              ))}
            </select>
            {error ? <p className="text-xs text-red-600">{error}</p> : null}
            {successMessage ? (
              <p className="text-xs text-emerald-700">{successMessage}</p>
            ) : null}
            <button
              type="button"
              onClick={handleAssign}
              disabled={!hasSelectionChanged || isPending}
              className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-cyan-600 px-3.5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-cyan-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <UserPlus className="h-4 w-4" />
              {isPending
                ? "Saving..."
                : isAssigned
                  ? "Change technician"
                  : "Assign technician"}
            </button>
          </div>
        ) : (
          <p className="text-sm text-slate-500">
            No team members are available to assign. Add active company members
            to enable assignments.
          </p>
        )
      ) : (
        <p className="text-sm text-slate-500">
          You do not have permission to assign technicians to this job.
        </p>
      )}
    </div>
  );
}
