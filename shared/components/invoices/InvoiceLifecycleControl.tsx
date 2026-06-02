"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  archiveInvoiceAction,
  moveInvoiceToTrashAction,
  permanentlyDeleteInvoiceAction,
  restoreInvoiceAction,
  restoreInvoiceFromTrashAction,
  voidInvoiceAction,
} from "@/app/actions/invoice-lifecycle";
import {
  canArchiveInvoice,
  canMoveInvoiceToTrash,
  canPermanentlyDeleteInvoice,
  canRestoreInvoice,
  canRestoreInvoiceFromTrash,
  canVoidInvoiceLifecycle,
  getInvoiceLifecycleState,
  getMoveInvoiceToTrashBlockReason,
  getPermanentDeleteInvoiceBlockReason,
  type InvoiceDeleteDependencies,
} from "@/shared/lib/invoice-lifecycle";
import { formatActionError } from "@/shared/lib/operational-errors";
import { formatDate } from "@/shared/types/customer";
import type { Invoice } from "@/shared/types/invoice";

type InvoiceLifecycleControlProps = {
  invoice: Pick<
    Invoice,
    | "id"
    | "invoiceNumber"
    | "status"
    | "amountPaid"
    | "archivedAt"
    | "deletedAt"
    | "deleteAfter"
  >;
  deleteDependencies: InvoiceDeleteDependencies;
  canManage: boolean;
};

export function InvoiceLifecycleControl({
  invoice,
  deleteDependencies,
  canManage,
}: InvoiceLifecycleControlProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (!canManage) return null;

  const lifecycleState = getInvoiceLifecycleState(invoice);
  const trashBlockReason = getMoveInvoiceToTrashBlockReason(invoice);
  const permanentDeleteBlockReason = getPermanentDeleteInvoiceBlockReason(
    invoice,
    deleteDependencies,
  );

  function runAction(action: () => Promise<{ error?: string }>, confirm?: string) {
    if (isPending) return;
    if (confirm && !window.confirm(confirm)) return;
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (result.error) {
        setError(formatActionError(result.error, "This invoice could not be updated."));
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        Cleanup
      </p>
      {lifecycleState === "deleted" && invoice.deletedAt ? (
        <p className="mt-2 text-xs text-orange-900">
          Deleted {formatDate(invoice.deletedAt)}
          {invoice.deleteAfter
            ? ` · eligible for permanent deletion after ${formatDate(invoice.deleteAfter)}`
            : null}
        </p>
      ) : null}
      {error ? <p className="mt-2 text-sm text-rose-700">{error}</p> : null}
      <div className="mt-3 flex flex-wrap gap-2">
        {lifecycleState === "active" || lifecycleState === "voided" ? (
          <>
            {canArchiveInvoice(invoice) ? (
              <button
                type="button"
                disabled={isPending}
                onClick={() =>
                  runAction(
                    () => archiveInvoiceAction(invoice.id),
                    `Archive invoice ${invoice.invoiceNumber}?`,
                  )
                }
                className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800"
              >
                Archive
              </button>
            ) : null}
            {lifecycleState === "active" && canVoidInvoiceLifecycle(invoice) ? (
              <button
                type="button"
                disabled={isPending}
                onClick={() =>
                  runAction(
                    () => voidInvoiceAction(invoice.id),
                    `Void invoice ${invoice.invoiceNumber}?`,
                  )
                }
                className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-900"
              >
                Void
              </button>
            ) : null}
            {lifecycleState === "active" && canMoveInvoiceToTrash(invoice) ? (
              <button
                type="button"
                disabled={isPending}
                onClick={() =>
                  runAction(
                    () => moveInvoiceToTrashAction(invoice.id),
                    `Move invoice ${invoice.invoiceNumber} to Recently Deleted?`,
                  )
                }
                className="rounded-lg border border-orange-300 bg-orange-50 px-3 py-1.5 text-xs font-semibold text-orange-900"
              >
                Move to Trash
              </button>
            ) : lifecycleState === "active" && trashBlockReason ? (
              <p className="text-xs text-slate-600">{trashBlockReason}</p>
            ) : null}
          </>
        ) : null}

        {lifecycleState === "archived" ? (
          <>
            {canRestoreInvoice(invoice) ? (
              <button
                type="button"
                disabled={isPending}
                onClick={() => runAction(() => restoreInvoiceAction(invoice.id))}
                className="rounded-lg border border-cyan-600 bg-cyan-600 px-3 py-1.5 text-xs font-semibold text-white"
              >
                Restore
              </button>
            ) : null}
            {canVoidInvoiceLifecycle(invoice) ? (
              <button
                type="button"
                disabled={isPending}
                onClick={() =>
                  runAction(
                    () => voidInvoiceAction(invoice.id),
                    `Void invoice ${invoice.invoiceNumber}?`,
                  )
                }
                className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-900"
              >
                Void
              </button>
            ) : null}
            {canMoveInvoiceToTrash(invoice) ? (
              <button
                type="button"
                disabled={isPending}
                onClick={() =>
                  runAction(
                    () => moveInvoiceToTrashAction(invoice.id),
                    `Move invoice ${invoice.invoiceNumber} to Recently Deleted?`,
                  )
                }
                className="rounded-lg border border-orange-300 bg-orange-50 px-3 py-1.5 text-xs font-semibold text-orange-900"
              >
                Move to Trash
              </button>
            ) : trashBlockReason ? (
              <p className="text-xs text-slate-600">{trashBlockReason}</p>
            ) : null}
          </>
        ) : null}

        {lifecycleState === "deleted" ? (
          <>
            {canRestoreInvoiceFromTrash(invoice) ? (
              <button
                type="button"
                disabled={isPending}
                onClick={() =>
                  runAction(() => restoreInvoiceFromTrashAction(invoice.id))
                }
                className="rounded-lg border border-cyan-600 bg-cyan-600 px-3 py-1.5 text-xs font-semibold text-white"
              >
                Restore
              </button>
            ) : null}
            {canPermanentlyDeleteInvoice(invoice, deleteDependencies) ? (
              <button
                type="button"
                disabled={isPending}
                onClick={() =>
                  runAction(
                    () => permanentlyDeleteInvoiceAction(invoice.id),
                    `Permanently delete invoice ${invoice.invoiceNumber}? This cannot be undone.`,
                  )
                }
                className="rounded-lg border border-rose-300 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-800"
              >
                Permanently Delete
              </button>
            ) : permanentDeleteBlockReason ? (
              <p className="text-xs text-slate-600">{permanentDeleteBlockReason}</p>
            ) : null}
          </>
        ) : null}
      </div>
    </div>
  );
}
