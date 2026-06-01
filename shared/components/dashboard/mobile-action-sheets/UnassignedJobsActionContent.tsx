"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { assignJobAction } from "@/app/actions/dispatch";
import {
  MobileActionButton,
  MobileActionRecordRow,
} from "@/shared/components/dashboard/mobile-action-sheets/MobileActionRecordRow";
import type { MobileActionSheetData } from "@/shared/lib/mobile-action-dashboard";
import { formatDispatchStatus } from "@/shared/types/dispatch";

type UnassignedJobsActionContentProps = {
  sheetData: MobileActionSheetData;
  totalCount: number;
};

export function UnassignedJobsActionContent({
  sheetData,
  totalCount,
}: UnassignedJobsActionContentProps) {
  const router = useRouter();
  const [pendingJobId, setPendingJobId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const { unassignedJobs, technicians, access } = sheetData;
  const canAssign = access.canViewTechnicianRoster && technicians.length > 0;
  const hiddenCount = Math.max(0, totalCount - unassignedJobs.length);

  function handleAssign(jobId: string, technicianId: string) {
    if (!technicianId || isPending) {
      return;
    }

    setError(null);
    setPendingJobId(jobId);

    startTransition(async () => {
      try {
        const result = await assignJobAction(jobId, technicianId);

        if (result.error) {
          setError(result.error);
          return;
        }

        router.refresh();
      } finally {
        setPendingJobId(null);
      }
    });
  }

  if (unassignedJobs.length === 0) {
    return (
      <p className="text-sm text-slate-600">
        No unassigned jobs in the preview. Open dispatch for the full list.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {error ? (
        <p className="rounded-lg border border-rose-100 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-800">
          {error}
        </p>
      ) : null}

      <ul className="space-y-1.5">
        {unassignedJobs.map((job) => {
          const isRowPending = pendingJobId === job.id && isPending;

          return (
            <MobileActionRecordRow
              key={job.id}
              title={`Job ${job.jobNumber}`}
              subtitle={job.customerName}
              meta={formatDispatchStatus(job.status)}
              actions={
                <>
                  {canAssign ? (
                    <select
                      aria-label={`Assign technician for job ${job.jobNumber}`}
                      defaultValue=""
                      disabled={isRowPending}
                      onChange={(event) => {
                        const technicianId = event.target.value;
                        if (technicianId) {
                          handleAssign(job.id, technicianId);
                        }
                      }}
                      className="max-w-[8.5rem] truncate rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-700"
                    >
                      <option value="">Assign…</option>
                      {technicians.map((tech) => (
                        <option key={tech.id} value={tech.id}>
                          {tech.name}
                        </option>
                      ))}
                    </select>
                  ) : null}
                  <MobileActionButton
                    label="Open job"
                    href={`/jobs/${job.id}`}
                    variant="secondary"
                  />
                </>
              }
            />
          );
        })}
      </ul>

      {hiddenCount > 0 ? (
        <p className="text-center text-xs font-medium text-slate-500">
          +{hiddenCount} more in dispatch
        </p>
      ) : null}

      <MobileActionButton
        label="Open dispatch board"
        href="/dispatch?focus=unassigned"
        variant="secondary"
      />
    </div>
  );
}
