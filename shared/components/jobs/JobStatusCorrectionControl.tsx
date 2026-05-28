"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { correctJobStatusAction } from "@/app/actions/jobs";
import { formatJobStatus, type JobStatus } from "@/shared/types/job";
import {
  canCorrectJobStatus,
  getAllowedStatusCorrectionTargets,
} from "@/shared/types/job-workflow";

type JobStatusCorrectionControlProps = {
  jobId: string;
  status: JobStatus;
  canCorrectStatus: boolean;
  disabled?: boolean;
  onStatusUpdated?: (status: JobStatus) => void;
};

export function JobStatusCorrectionControl({
  jobId,
  status,
  canCorrectStatus,
  disabled = false,
  onStatusUpdated,
}: JobStatusCorrectionControlProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [targetStatus, setTargetStatus] = useState<JobStatus | "">("");
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const correctionTargets = getAllowedStatusCorrectionTargets(status);
  const isVisible =
    canCorrectStatus && canCorrectJobStatus(status) && correctionTargets.length > 0;

  useEffect(() => {
    setTargetStatus("");
    setError(null);
    setSuccessMessage(null);
  }, [status]);

  if (!isVisible) {
    return null;
  }

  function handleSubmit() {
    if (!targetStatus) {
      return;
    }

    setError(null);
    setSuccessMessage(null);

    startTransition(async () => {
      const result = await correctJobStatusAction(jobId, targetStatus);

      if (result.error || !result.job) {
        setError(result.error ?? "Failed to correct job status.");
        return;
      }

      setSuccessMessage(
        `Status corrected to ${formatJobStatus(result.job.status)}.`,
      );
      setTargetStatus("");
      onStatusUpdated?.(result.job.status);
      router.refresh();
    });
  }

  const selectClass =
    "w-full rounded-lg border border-amber-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-200 disabled:cursor-not-allowed disabled:opacity-60";

  return (
    <div className="rounded-xl border border-dashed border-amber-200 bg-amber-50/60 p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-amber-800">
        Correct status
      </p>
      <p className="mt-1 text-xs text-amber-900/80">
        Move this job back to an earlier workflow step when a status was set by
        mistake. This does not reopen completed or cancelled jobs.
      </p>

      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end">
        <div className="min-w-0 flex-1">
          <label
            htmlFor={`status-correction-${jobId}`}
            className="sr-only"
          >
            Correct status target
          </label>
          <select
            id={`status-correction-${jobId}`}
            value={targetStatus}
            onChange={(event) => {
              setTargetStatus(event.target.value as JobStatus);
              setError(null);
              setSuccessMessage(null);
            }}
            disabled={disabled || isPending}
            className={selectClass}
          >
            <option value="">Select corrected status…</option>
            {correctionTargets.map((option) => (
              <option key={option} value={option}>
                {formatJobStatus(option)}
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          onClick={handleSubmit}
          disabled={disabled || isPending || !targetStatus}
          className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-lg border border-amber-300 bg-white px-4 py-2 text-sm font-semibold text-amber-900 transition-colors hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? "Applying…" : "Apply correction"}
        </button>
      </div>

      {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
      {successMessage ? (
        <p className="mt-2 text-sm text-emerald-700">{successMessage}</p>
      ) : null}
    </div>
  );
}
