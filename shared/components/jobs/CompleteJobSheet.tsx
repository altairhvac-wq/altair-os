"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, X } from "lucide-react";
import { updateJobStatusAction } from "@/app/actions/jobs";
import type { JobStatus } from "@/shared/types/job";

type CompleteJobSheetProps = {
  jobId: string;
  currentStatus: JobStatus;
  onClose: () => void;
  onCompleted?: (status: JobStatus) => void;
};

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-colors focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20";

const labelClass = "mb-1.5 block text-xs font-semibold text-slate-600";

export function CompleteJobSheet({
  jobId,
  currentStatus,
  onClose,
  onCompleted,
}: CompleteJobSheetProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [completionNotes, setCompletionNotes] = useState("");
  const [followUpNotes, setFollowUpNotes] = useState("");

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !isPending) {
        onClose();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [isPending, onClose]);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    startTransition(async () => {
      const result = await updateJobStatusAction(jobId, "complete", currentStatus, {
        completionNotes: completionNotes.trim() || undefined,
        followUpNotes: followUpNotes.trim() || undefined,
      });

      if (result.error || !result.job) {
        setError(result.error ?? "Failed to complete job.");
        return;
      }

      onCompleted?.(result.job.status);
      onClose();
      router.refresh();
    });
  }

  return (
    <div
      className="fixed inset-0 z-40 flex items-end justify-center p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="complete-job-sheet-title"
    >
      <button
        type="button"
        aria-label="Close complete job"
        onClick={onClose}
        disabled={isPending}
        className="absolute inset-0 bg-slate-900/40"
      />
      <div className="relative z-10 flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl border border-slate-200 bg-white shadow-xl sm:max-h-[85vh] sm:rounded-2xl">
        <header className="flex shrink-0 items-center gap-3 border-b border-slate-100 bg-slate-50/70 px-4 py-3.5 sm:px-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 ring-1 ring-emerald-600/15">
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
          </div>
          <div className="min-w-0 flex-1">
            <h2
              id="complete-job-sheet-title"
              className="text-base font-bold text-slate-900"
            >
              Complete work
            </h2>
            <p className="text-sm text-slate-500">
              Add notes before marking this job complete.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 disabled:opacity-50"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="space-y-4 overflow-y-auto px-4 py-4 sm:px-5">
            <div>
              <label htmlFor="completion-notes" className={labelClass}>
                Completion notes
              </label>
              <textarea
                id="completion-notes"
                rows={4}
                value={completionNotes}
                onChange={(event) => setCompletionNotes(event.target.value)}
                placeholder="What was done on site?"
                className={inputClass}
              />
            </div>

            <div>
              <label htmlFor="follow-up-notes" className={labelClass}>
                Follow-up recommendation{" "}
                <span className="font-normal text-slate-400">(optional)</span>
              </label>
              <textarea
                id="follow-up-notes"
                rows={3}
                value={followUpNotes}
                onChange={(event) => setFollowUpNotes(event.target.value)}
                placeholder="Any recommended follow-up for the office?"
                className={inputClass}
              />
            </div>

            {error ? <p className="text-sm text-red-600">{error}</p> : null}
          </div>

          <footer className="flex shrink-0 gap-3 border-t border-slate-100 px-4 py-4 sm:px-5">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="inline-flex flex-1 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="inline-flex flex-1 items-center justify-center rounded-xl bg-emerald-600 px-4 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isPending ? "Completing..." : "Complete work"}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}
