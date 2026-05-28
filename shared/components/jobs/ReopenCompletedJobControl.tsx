"use client";

import { RotateCcw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { reopenCompletedJobAction } from "@/app/actions/jobs";
import { formatJobStatus, type JobStatus } from "@/shared/types/job";
import {
  canReopenCompletedJob,
  resolveReopenTargetStatus,
  type ReopenTargetJobSnapshot,
} from "@/shared/types/job-workflow";

type ReopenCompletedJobControlProps = {
  jobId: string;
  status: JobStatus;
  canReopenJob: boolean;
  reopenSnapshot: ReopenTargetJobSnapshot;
  disabled?: boolean;
  onStatusUpdated?: (status: JobStatus) => void;
};

export function ReopenCompletedJobControl({
  jobId,
  status,
  canReopenJob,
  reopenSnapshot,
  disabled = false,
  onStatusUpdated,
}: ReopenCompletedJobControlProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const targetStatus = resolveReopenTargetStatus(reopenSnapshot);
  const isVisible = canReopenJob && canReopenCompletedJob(status);

  useEffect(() => {
    setError(null);
    setSuccessMessage(null);
  }, [status]);

  if (!isVisible) {
    return null;
  }

  function handleReopen() {
    setError(null);
    setSuccessMessage(null);

    startTransition(async () => {
      const result = await reopenCompletedJobAction(jobId);

      if (result.error || !result.job) {
        setError(result.error ?? "Failed to reopen job.");
        return;
      }

      setSuccessMessage(
        `Job reopened to ${formatJobStatus(result.job.status)}.`,
      );
      onStatusUpdated?.(result.job.status);
      router.refresh();
    });
  }

  return (
    <div className="rounded-xl border border-dashed border-sky-200 bg-sky-50/60 p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-sky-800">
        Reopen job
      </p>
      <p className="mt-1 text-xs text-sky-900/80">
        Use this when work must continue after completion. This is an operational
        correction, not a normal status change. Completion notes are kept for
        history. The job returns to{" "}
        <span className="font-semibold">{formatJobStatus(targetStatus)}</span>.
      </p>

      <button
        type="button"
        onClick={handleReopen}
        disabled={disabled || isPending}
        className="mt-3 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-lg border border-sky-300 bg-white px-4 py-2 text-sm font-semibold text-sky-900 transition-colors hover:bg-sky-100 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
      >
        <RotateCcw className="h-4 w-4 shrink-0" />
        {isPending ? "Reopening…" : "Reopen job"}
      </button>

      {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
      {successMessage ? (
        <p className="mt-2 text-sm text-emerald-700">{successMessage}</p>
      ) : null}
    </div>
  );
}
