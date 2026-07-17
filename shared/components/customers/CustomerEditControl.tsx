"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";
import { updateCustomerAction } from "@/app/actions/customers";
import { formatActionError } from "@/shared/lib/operational-errors";
import { CustomerForm } from "./CustomerForm";
import {
  mapCustomerToFormData,
  validateCustomerFormData,
  type Customer,
  type CustomerFormData,
} from "@/shared/types/customer";
import { northStarDetailTokens as dt } from "@/shared/design-system/north-star/tokens";
import {
  AltairDialog,
  AltairDialogBody,
  AltairDialogClose,
  AltairDialogContent,
  AltairDialogDescription,
  AltairDialogHeader,
  AltairDialogTitle,
} from "@/shared/design-system/dialog";

type CustomerEditControlProps = {
  customer: Customer;
  canManage: boolean;
  northStar?: boolean;
};

export function CustomerEditControl({
  customer,
  canManage,
  northStar = false,
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
        className={
          northStar
            ? dt.secondaryAction
            : "inline-flex shrink-0 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
        }
      >
        <Pencil className="h-4 w-4" />
        Edit customer
      </button>

      <AltairDialog open={panelOpen} onOpenChange={closePanel} closeDisabled={isPending}>
        <AltairDialogContent size="md">
          <AltairDialogHeader>
            <div>
              <AltairDialogTitle>Edit customer</AltairDialogTitle>
              <AltairDialogDescription>
                Update contact details and service location.
              </AltairDialogDescription>
            </div>
            <AltairDialogClose disabled={isPending} />
          </AltairDialogHeader>

          <AltairDialogBody>
            <CustomerForm
              key={customer.id}
              variant="edit"
              initialData={mapCustomerToFormData(customer)}
              onSubmit={handleSubmit}
              onCancel={closePanel}
              error={error}
              isSubmitting={isPending}
            />
          </AltairDialogBody>
        </AltairDialogContent>
      </AltairDialog>
    </>
  );
}
