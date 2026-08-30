"use client";

import { useState, useTransition } from "react";
import { useConfirm } from "@/shared/design-system/dialog";
import { useRouter } from "next/navigation";
import { buttonClassName } from "@/shared/design-system/components/button-styles";
import {
  archiveJobAction,
  cancelJobAction,
  moveJobToTrashAction,
  permanentlyDeleteJobAction,
  restoreJobAction,
  restoreJobFromTrashAction,
} from "@/app/actions/job-lifecycle";
import {
  canArchiveJob,
  canCancelJob,
  canMoveJobToTrash,
  canPermanentlyDeleteJob,
  canRestoreJob,
  canRestoreJobFromTrash,
  getJobLifecycleState,
  getMoveJobToTrashBlockReason,
  getPermanentDeleteJobBlockReason,
  type JobDeleteDependencies,
} from "@/shared/lib/job-lifecycle";
import { formatActionError } from "@/shared/lib/operational-errors";
import type { Job } from "@/shared/types/job";
import { northStarDetailTokens as dt } from "@/shared/design-system/north-star/tokens";

type JobLifecycleControlProps = {
  job: Job;
  deleteDependencies: JobDeleteDependencies;
  canManage: boolean;
  northStar?: boolean;
};

export function JobLifecycleControl({
  job,
  deleteDependencies,
  canManage,
  northStar = false,
}: JobLifecycleControlProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const { confirm, confirmDialog } = useConfirm();

  if (!canManage) return null;

  const lifecycleState = getJobLifecycleState(job);
  const trashBlockReason = getMoveJobToTrashBlockReason(job, deleteDependencies);
  const permanentDeleteBlockReason = getPermanentDeleteJobBlockReason(
    job,
    deleteDependencies,
  );

  async function runAction(
    action: () => Promise<{ error?: string }>,
    confirmMessage?: string,
  ) {
    if (isPending) return;
    if (confirmMessage) {
      const ok = await confirm({
        title: confirmMessage,
        confirmLabel: "Continue",
        destructive: true,
      });
      if (!ok) return;
    }
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (result.error) {
        setError(formatActionError(result.error, "This job could not be updated."));
        return;
      }
      router.refresh();
    });
  }

  return (
    <div
      className={
        northStar
          ? `${dt.compactSectionSurface} scroll-mt-6`
          : "rounded-xl border border-slate-200 bg-slate-50/80 p-4"
      }
    >
      <p
        className={
          northStar
            ? dt.sectionTitle
            : "text-xs font-semibold uppercase tracking-wide text-slate-500"
        }
      >
        Cleanup
      </p>
      {error ? <p className="mt-2 text-sm text-rose-700">{error}</p> : null}
      <div className="mt-3 flex flex-wrap gap-2">
        {lifecycleState === "active" ? (
          <>
            {canArchiveJob(job) ? (
              <button
                type="button"
                disabled={isPending}
                onClick={() =>
                  runAction(
                    () => archiveJobAction(job.id),
                    `Archive job ${job.jobNumber}?`,
                  )
                }
                className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800"
              >
                Archive
              </button>
            ) : null}
            {canCancelJob(job) ? (
              <button
                type="button"
                disabled={isPending}
                onClick={() =>
                  runAction(
                    () => cancelJobAction(job.id),
                    `Cancel job ${job.jobNumber}?`,
                  )
                }
                className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-900"
              >
                Cancel job
              </button>
            ) : null}
            {canMoveJobToTrash(job, deleteDependencies) ? (
              <button
                type="button"
                disabled={isPending}
                onClick={() =>
                  runAction(
                    () => moveJobToTrashAction(job.id),
                    `Move job ${job.jobNumber} to Recently Deleted?`,
                  )
                }
                className="rounded-lg border border-orange-300 bg-orange-50 px-3 py-1.5 text-xs font-semibold text-orange-900"
              >
                Move to Trash
              </button>
            ) : (
              <p className="text-xs text-slate-600">{trashBlockReason}</p>
            )}
          </>
        ) : null}
        {lifecycleState === "archived" ? (
          <>
            {canRestoreJob(job) ? (
              <button
                type="button"
                disabled={isPending}
                onClick={() => runAction(() => restoreJobAction(job.id))}
                className={buttonClassName("primary", "sm")}
              >
                Restore
              </button>
            ) : null}
            {canMoveJobToTrash(job, deleteDependencies) ? (
              <button
                type="button"
                disabled={isPending}
                onClick={() =>
                  runAction(
                    () => moveJobToTrashAction(job.id),
                    `Move job ${job.jobNumber} to Recently Deleted?`,
                  )
                }
                className="rounded-lg border border-orange-300 bg-orange-50 px-3 py-1.5 text-xs font-semibold text-orange-900"
              >
                Move to Trash
              </button>
            ) : (
              <p className="text-xs text-slate-600">{trashBlockReason}</p>
            )}
          </>
        ) : null}
        {lifecycleState === "deleted" ? (
          <>
            {canRestoreJobFromTrash(job) ? (
              <button
                type="button"
                disabled={isPending}
                onClick={() => runAction(() => restoreJobFromTrashAction(job.id))}
                className={buttonClassName("primary", "sm")}
              >
                Restore
              </button>
            ) : null}
            {canPermanentlyDeleteJob(job, deleteDependencies) ? (
              <button
                type="button"
                disabled={isPending}
                onClick={() =>
                  runAction(
                    () => permanentlyDeleteJobAction(job.id),
                    `Permanently delete job ${job.jobNumber}? This cannot be undone.`,
                  )
                }
                className="rounded-lg border border-rose-300 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-800"
              >
                Permanently Delete
              </button>
            ) : (
              <p className="text-xs text-slate-600">{permanentDeleteBlockReason}</p>
            )}
          </>
        ) : null}
      </div>
      {confirmDialog}
    </div>
  );
}
