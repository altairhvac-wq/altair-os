"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, X } from "lucide-react";
import { updateCustomerAction } from "@/app/actions/customers";
import { formatActionError } from "@/shared/lib/operational-errors";
import { CustomerForm } from "./CustomerForm";
import {
  mapCustomerToFormData,
  validateCustomerFormData,
  type Customer,
  type CustomerFormData,
} from "@/shared/types/customer";

type CustomerEditControlProps = {
  customer: Customer;
  canManage: boolean;
};

export function CustomerEditControl({
  customer,
  canManage,
}: CustomerEditControlProps) {
  const router = useRouter();
  const [panelOpen, setPanelOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (!canManage) {
    return null;
  }

  function openPanel() {
    setError(null);
    setPanelOpen(true);
  }

  function closePanel() {
    if (isPending) {
      return;
    }
    setPanelOpen(false);
    setError(null);
  }

  function handleSubmit(data: CustomerFormData) {
    setError(null);

    const validationError = validateCustomerFormData(data, {
      requireContact: false,
    });
    if (validationError) {
      setError(validationError);
      return;
    }

    startTransition(async () => {
      const result = await updateCustomerAction(customer.id, data);

      if (result.error || !result.customer) {
        setError(formatActionError(result.error, "We couldn't save your changes. Try again."));
        return;
      }

      closePanel();
      router.refresh();
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={openPanel}
        className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
      >
        <Pencil className="h-4 w-4" />
        Edit customer
      </button>

      {panelOpen ? (
        <div className="fixed inset-0 z-40 flex items-end justify-center p-0 sm:items-center sm:p-4">
          <button
            type="button"
            aria-label="Close customer edit form"
            onClick={closePanel}
            disabled={isPending}
            className="absolute inset-0 bg-slate-900/40"
          />
          <div className="relative z-10 flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl border border-slate-200 bg-white shadow-xl sm:max-h-[85vh] sm:rounded-2xl">
            <header className="flex shrink-0 items-center justify-between border-b border-slate-100 px-4 py-3.5 sm:px-5">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Edit customer
                </h3>
                <p className="text-sm text-slate-500">
                  Update contact details and service location.
                </p>
              </div>
              <button
                type="button"
                onClick={closePanel}
                disabled={isPending}
                className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5">
              <CustomerForm
                key={customer.id}
                variant="edit"
                initialData={mapCustomerToFormData(customer)}
                onSubmit={handleSubmit}
                onCancel={closePanel}
                error={error}
                isSubmitting={isPending}
              />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
