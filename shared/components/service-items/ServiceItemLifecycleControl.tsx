"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  archiveServiceItemAction,
  getServiceItemLifecycleDepsAction,
  moveServiceItemToTrashAction,
  permanentlyDeleteServiceItemAction,
  restoreServiceItemAction,
  restoreServiceItemFromTrashAction,
} from "@/app/actions/service-item-lifecycle";
import {
  canArchiveServiceItem,
  canMoveServiceItemToTrash,
  canPermanentlyDeleteServiceItem,
  canRestoreServiceItem,
  canRestoreServiceItemFromTrash,
  getMoveServiceItemToTrashBlockReason,
  getPermanentDeleteServiceItemBlockReason,
  getServiceItemLifecycleState,
  type ServiceItemDeleteDependencies,
} from "@/shared/lib/service-item-lifecycle";
import { formatActionError } from "@/shared/lib/operational-errors";
import { formatDate } from "@/shared/types/customer";
import type { ServiceItem } from "@/shared/types/service-item";

type ServiceItemLifecycleControlProps = {
  serviceItem: Pick<
    ServiceItem,
    "id" | "name" | "archivedAt" | "deletedAt" | "deleteAfter"
  >;
  canManage: boolean;
  onDeleted?: () => void;
};

export function ServiceItemLifecycleControl({
  serviceItem,
  canManage,
  onDeleted,
}: ServiceItemLifecycleControlProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [dependencies, setDependencies] =
    useState<ServiceItemDeleteDependencies | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;

    void getServiceItemLifecycleDepsAction(serviceItem.id).then((result) => {
      if (!cancelled && result.dependencies) {
        setDependencies(result.dependencies);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [serviceItem.id]);

  if (!canManage) return null;

  const lifecycleState = getServiceItemLifecycleState(serviceItem);
  const emptyDeps: ServiceItemDeleteDependencies = {
    estimateLineItemCount: 0,
    invoiceLineItemCount: 0,
    jobMaterialCount: 0,
  };
  const resolvedDeps = dependencies ?? emptyDeps;
  const trashBlockReason = getMoveServiceItemToTrashBlockReason(
    serviceItem,
    resolvedDeps,
  );
  const permanentDeleteBlockReason = getPermanentDeleteServiceItemBlockReason(
    serviceItem,
    resolvedDeps,
  );

  function runAction(
    action: () => Promise<{ error?: string; deleted?: boolean }>,
    confirm?: string,
    onDeleted?: () => void,
  ) {
    if (isPending) return;
    if (confirm && !window.confirm(confirm)) return;
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (result.error) {
        setError(formatActionError(result.error, "This item could not be updated."));
        return;
      }
      if (result.deleted) {
        onDeleted?.();
      }
      router.refresh();
    });
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        Cleanup
      </p>
      {lifecycleState === "deleted" && serviceItem.deletedAt ? (
        <p className="mt-2 text-xs text-orange-900">
          Deleted {formatDate(serviceItem.deletedAt)}
          {serviceItem.deleteAfter
            ? ` · eligible for permanent deletion after ${formatDate(serviceItem.deleteAfter)}`
            : null}
        </p>
      ) : null}
      {error ? <p className="mt-2 text-sm text-rose-700">{error}</p> : null}
      <div className="mt-3 flex flex-wrap gap-2">
        {lifecycleState === "active" ? (
          <>
            {canArchiveServiceItem(serviceItem) ? (
              <button
                type="button"
                disabled={isPending}
                onClick={() =>
                  runAction(
                    () => archiveServiceItemAction(serviceItem.id),
                    `Archive ${serviceItem.name}? It will be hidden from pickers but preserved on existing records.`,
                  )
                }
                className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800"
              >
                Archive
              </button>
            ) : null}
            {canMoveServiceItemToTrash(serviceItem, resolvedDeps) ? (
              <button
                type="button"
                disabled={isPending}
                onClick={() =>
                  runAction(
                    () => moveServiceItemToTrashAction(serviceItem.id),
                    `Move ${serviceItem.name} to Recently Deleted?`,
                  )
                }
                className="rounded-lg border border-orange-300 bg-orange-50 px-3 py-1.5 text-xs font-semibold text-orange-900"
              >
                Move to Trash
              </button>
            ) : dependencies && trashBlockReason ? (
              <p className="text-xs text-slate-600">{trashBlockReason}</p>
            ) : null}
          </>
        ) : null}

        {lifecycleState === "archived" ? (
          <>
            {canRestoreServiceItem(serviceItem) ? (
              <button
                type="button"
                disabled={isPending}
                onClick={() => runAction(() => restoreServiceItemAction(serviceItem.id))}
                className="rounded-lg border border-cyan-600 bg-cyan-600 px-3 py-1.5 text-xs font-semibold text-white"
              >
                Restore
              </button>
            ) : null}
            {canMoveServiceItemToTrash(serviceItem, resolvedDeps) ? (
              <button
                type="button"
                disabled={isPending}
                onClick={() =>
                  runAction(
                    () => moveServiceItemToTrashAction(serviceItem.id),
                    `Move ${serviceItem.name} to Recently Deleted?`,
                  )
                }
                className="rounded-lg border border-orange-300 bg-orange-50 px-3 py-1.5 text-xs font-semibold text-orange-900"
              >
                Move to Trash
              </button>
            ) : dependencies && trashBlockReason ? (
              <p className="text-xs text-slate-600">{trashBlockReason}</p>
            ) : null}
          </>
        ) : null}

        {lifecycleState === "deleted" ? (
          <>
            {canRestoreServiceItemFromTrash(serviceItem) ? (
              <button
                type="button"
                disabled={isPending}
                onClick={() =>
                  runAction(() => restoreServiceItemFromTrashAction(serviceItem.id))
                }
                className="rounded-lg border border-cyan-600 bg-cyan-600 px-3 py-1.5 text-xs font-semibold text-white"
              >
                Restore
              </button>
            ) : null}
            {canPermanentlyDeleteServiceItem(serviceItem, resolvedDeps) ? (
              <button
                type="button"
                disabled={isPending}
                onClick={() =>
                  runAction(
                    () => permanentlyDeleteServiceItemAction(serviceItem.id),
                    `Permanently delete ${serviceItem.name}? This cannot be undone.`,
                    onDeleted,
                  )
                }
                className="rounded-lg border border-rose-300 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-800"
              >
                Permanently Delete
              </button>
            ) : dependencies && permanentDeleteBlockReason ? (
              <p className="text-xs text-slate-600">{permanentDeleteBlockReason}</p>
            ) : null}
          </>
        ) : null}
      </div>
    </div>
  );
}
