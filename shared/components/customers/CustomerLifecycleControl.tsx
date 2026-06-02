"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Archive, Loader2, RotateCcw, Trash2 } from "lucide-react";
import {
  archiveCustomerAction,
  deleteCustomerAction,
  restoreCustomerAction,
} from "@/app/actions/customers";
import {
  canArchiveCustomer,
  canDeleteCustomer,
  canRestoreCustomer,
  getDeleteCustomerBlockReason,
  isCustomerArchived,
  type CustomerDeleteDependencies,
} from "@/shared/lib/customer-lifecycle";
import { formatActionError } from "@/shared/lib/operational-errors";
import type { Customer } from "@/shared/types/customer";

type CustomerLifecycleControlProps = {
  customer: Customer;
  deleteDependencies: CustomerDeleteDependencies;
  canManage: boolean;
};

export function CustomerLifecycleControl({
  customer,
  deleteDependencies,
  canManage,
}: CustomerLifecycleControlProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (!canManage) {
    return null;
  }

  const archived = isCustomerArchived(customer);
  const deleteBlockReason = getDeleteCustomerBlockReason(deleteDependencies);
  const canDelete = canDeleteCustomer(deleteDependencies);

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

  function handleRestore() {
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

  function handleDelete() {
    if (!canDelete || isPending) {
      return;
    }

    const confirmed = window.confirm(
      `Permanently delete ${customer.name}? This cannot be undone.`,
    );

    if (!confirmed) {
      return;
    }

    setError(null);
    startTransition(async () => {
      const result = await deleteCustomerAction(customer.id);

      if (result.error) {
        setError(formatActionError(result.error, "We couldn't delete this customer."));
        return;
      }

      router.push("/customers");
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex flex-wrap items-center justify-end gap-2">
        {archived ? (
          <button
            type="button"
            onClick={handleRestore}
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
        ) : (
          <button
            type="button"
            onClick={handleArchive}
            disabled={isPending}
            className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Archive className="h-4 w-4" aria-hidden="true" />
            )}
            Archive
          </button>
        )}

        <button
          type="button"
          onClick={handleDelete}
          disabled={isPending || !canDelete}
          title={deleteBlockReason ?? undefined}
          className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-semibold text-rose-800 transition-colors hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <Trash2 className="h-4 w-4" aria-hidden="true" />
          )}
          Delete
        </button>
      </div>

      {deleteBlockReason ? (
        <p className="max-w-sm text-right text-xs text-slate-500">
          {deleteBlockReason}
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
