"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Archive, Loader2, RotateCcw, Trash2 } from "lucide-react";
import {
  archiveCustomerAction,
  moveCustomerToTrashAction,
  permanentlyDeleteCustomerAction,
  restoreCustomerAction,
  restoreCustomerFromTrashAction,
} from "@/app/actions/customers";
import {
  canArchiveCustomer,
  canMoveCustomerToTrash,
  canPermanentlyDeleteCustomer,
  canRestoreCustomer,
  canRestoreCustomerFromTrash,
  getCustomerLifecycleState,
  getPermanentDeleteCustomerBlockReason,
  type CustomerDeleteDependencies,
} from "@/shared/lib/customer-lifecycle";
import { formatActionError } from "@/shared/lib/operational-errors";
import { formatDate, type Customer } from "@/shared/types/customer";
import { northStarDetailTokens as dt } from "@/shared/design-system/north-star/tokens";

type CustomerLifecycleControlProps = {
  customer: Customer;
  deleteDependencies: CustomerDeleteDependencies;
  canManage: boolean;
  northStar?: boolean;
};

export function CustomerLifecycleControl({
  customer,
  deleteDependencies,
  canManage,
  northStar = false,
}: CustomerLifecycleControlProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (!canManage) {
    return null;
  }

  const lifecycleState = getCustomerLifecycleState(customer);
  const permanentDeleteBlockReason = getPermanentDeleteCustomerBlockReason(
    customer,
    deleteDependencies,
  );
  const canPermanentlyDelete = canPermanentlyDeleteCustomer(
    customer,
    deleteDependencies,
  );

  function handleArchive() {
    if (!canArchiveCustomer(customer) || isPending) {
      return;
    }

    const confirmed = window.confirm(
      `Archive ${customer.name}? They will be hidden from active customer lists, but historical records will be preserved.`,
    );

    if (!confirmed) {
      return;
    }

    setError(null);
    startTransition(async () => {
      const result = await archiveCustomerAction(customer.id);

      if (result.error) {
        setError(formatActionError(result.error, "We couldn't archive this customer."));
        return;
      }

      router.refresh();
    });
  }

  function handleRestoreFromArchive() {
    if (!canRestoreCustomer(customer) || isPending) {
      return;
    }

    setError(null);
    startTransition(async () => {
      const result = await restoreCustomerAction(customer.id);

      if (result.error) {
        setError(formatActionError(result.error, "We couldn't restore this customer."));
        return;
      }

      router.refresh();
    });
  }

  function handleMoveToTrash() {
    if (!canMoveCustomerToTrash(customer) || isPending) {
      return;
    }

    const confirmed = window.confirm(
      `Move ${customer.name} to Recently Deleted? They will be hidden from customer lists for 60 days.`,
    );

    if (!confirmed) {
      return;
    }

    setError(null);
    startTransition(async () => {
      const result = await moveCustomerToTrashAction(customer.id);

      if (result.error) {
        setError(
          formatActionError(
            result.error,
            "We couldn't move this customer to Recently Deleted.",
          ),
        );
        return;
      }

      router.refresh();
    });
  }

  function handleRestoreFromTrash() {
    if (!canRestoreCustomerFromTrash(customer) || isPending) {
      return;
    }

    setError(null);
    startTransition(async () => {
      const result = await restoreCustomerFromTrashAction(customer.id);

      if (result.error) {
        setError(formatActionError(result.error, "We couldn't restore this customer."));
        return;
      }

      router.refresh();
    });
  }

  function handlePermanentDelete() {
    if (!canPermanentlyDelete || isPending) {
      return;
    }

    const confirmed = window.confirm(
      `Permanently delete ${customer.name}? This action cannot be undone and will remove this customer record entirely.`,
    );

    if (!confirmed) {
      return;
    }

    setError(null);
    startTransition(async () => {
      const result = await permanentlyDeleteCustomerAction(customer.id);

      if (result.error) {
        setError(
          formatActionError(
            result.error,
            "We couldn't permanently delete this customer.",
          ),
        );
        return;
      }

      router.push("/customers");
      router.refresh();
    });
  }

  const secondaryButtonClass = northStar
    ? dt.tertiaryAction
    : "inline-flex shrink-0 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60";

  return (
    <div className="flex flex-col items-end gap-2">
      {lifecycleState === "deleted" && customer.deletedAt ? (
        <div className="max-w-sm rounded-md border border-orange-200 bg-orange-50 px-3 py-2 text-right text-xs text-orange-900">
          <p>
            Deleted {formatDate(customer.deletedAt)}
            {customer.deleteAfter
              ? ` · eligible for permanent deletion after ${formatDate(customer.deleteAfter)}`
              : null}
          </p>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-end gap-2">
        {lifecycleState === "active" ? (
          <>
            <button
              type="button"
              onClick={handleArchive}
              disabled={isPending}
              className={secondaryButtonClass}
            >
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <Archive className="h-4 w-4" aria-hidden="true" />
              )}
              Archive
            </button>
            <button
              type="button"
              onClick={handleMoveToTrash}
              disabled={isPending}
              className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-orange-200 bg-orange-50 px-4 py-2.5 text-sm font-semibold text-orange-900 transition-colors hover:bg-orange-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <Trash2 className="h-4 w-4" aria-hidden="true" />
              )}
              Move to Trash
            </button>
          </>
        ) : null}

        {lifecycleState === "archived" ? (
          <>
            <button
              type="button"
              onClick={handleRestoreFromArchive}
              disabled={isPending}
              className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-cyan-200 bg-cyan-50 px-4 py-2.5 text-sm font-semibold text-cyan-900 transition-colors hover:bg-cyan-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <RotateCcw className="h-4 w-4" aria-hidden="true" />
              )}
              Restore
            </button>
            <button
              type="button"
              onClick={handleMoveToTrash}
              disabled={isPending}
              className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-orange-200 bg-orange-50 px-4 py-2.5 text-sm font-semibold text-orange-900 transition-colors hover:bg-orange-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <Trash2 className="h-4 w-4" aria-hidden="true" />
              )}
              Move to Trash
            </button>
          </>
        ) : null}

        {lifecycleState === "deleted" ? (
          <>
            <button
              type="button"
              onClick={handleRestoreFromTrash}
              disabled={isPending}
              className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-cyan-200 bg-cyan-50 px-4 py-2.5 text-sm font-semibold text-cyan-900 transition-colors hover:bg-cyan-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <RotateCcw className="h-4 w-4" aria-hidden="true" />
              )}
              Restore
            </button>
            <button
              type="button"
              onClick={handlePermanentDelete}
              disabled={isPending || !canPermanentlyDelete}
              title={permanentDeleteBlockReason ?? undefined}
              className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-semibold text-rose-800 transition-colors hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <Trash2 className="h-4 w-4" aria-hidden="true" />
              )}
              Permanently Delete
            </button>
          </>
        ) : null}
      </div>

      {lifecycleState === "deleted" && permanentDeleteBlockReason ? (
        <p className="max-w-sm text-right text-xs text-slate-500">
          {permanentDeleteBlockReason}
        </p>
      ) : null}

      {error ? (
        <p className="max-w-sm text-right text-xs font-medium text-rose-700">
          {error}
        </p>
      ) : null}
    </div>
  );
}
