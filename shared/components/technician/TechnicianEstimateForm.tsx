"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createFieldEstimateFromJobAction } from "@/app/actions/estimates";
import { LineItemsEditor } from "@/shared/components/estimates/LineItemsEditor";
import { formatActionError, formatRetryGuidance } from "@/shared/lib/operational-errors";
import type { EstimateLineItemFormData } from "@/shared/types/estimate";
import type { ServiceItem } from "@/shared/types/service-item";
import {
  adminDetailsBodyClass,
  adminDetailsClass,
  adminDetailsSummaryClass,
  adminFormInputClass,
  adminFormStackClass,
} from "@/shared/lib/admin-density";

type TechnicianEstimateFormProps = {
  jobId: string;
  jobNumber: string;
  customerName: string;
  serviceItems: ServiceItem[];
  defaultTaxRate: number;
  onSuccess?: (estimateNumber: string) => void;
  onCancel: () => void;
  onSubmittingChange?: (isSubmitting: boolean) => void;
};

const emptyLineItem: EstimateLineItemFormData = {
  name: "",
  description: "",
  quantity: 1,
  unitPrice: 0,
  taxable: true,
};

export function TechnicianEstimateForm({
  jobId,
  jobNumber,
  customerName,
  serviceItems,
  defaultTaxRate,
  onSuccess,
  onCancel,
  onSubmittingChange,
}: TechnicianEstimateFormProps) {
  const router = useRouter();
  const submitLockRef = useRef(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [lineItems, setLineItems] = useState<EstimateLineItemFormData[]>([
    { ...emptyLineItem },
  ]);

  useEffect(() => {
    onSubmittingChange?.(isPending);
  }, [isPending, onSubmittingChange]);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isPending || submitLockRef.current) {
      return;
    }

    const validLineItems = lineItems.filter(
      (item) =>
        (item.name.trim().length > 0 || item.description.trim().length > 0) &&
        item.quantity > 0,
    );

    if (validLineItems.length === 0) {
      setError("Add at least one line item with a name and quantity.");
      return;
    }

    submitLockRef.current = true;
    setError(null);

    startTransition(async () => {
      const result = await createFieldEstimateFromJobAction(jobId, {
        lineItems: validLineItems,
        notes,
      });

      submitLockRef.current = false;

      if (result.error || !result.estimate) {
        setError(
          formatRetryGuidance(
            formatActionError(
              result.error,
              "Could not save this estimate. Try again.",
            ),
          ),
        );
        return;
      }

      router.refresh();
      onSuccess?.(result.estimate.estimateNumber);
    });
  }

  return (
    <form
      id="technician-estimate-form"
      onSubmit={handleSubmit}
      className={`min-w-0 ${adminFormStackClass}`}
      aria-busy={isPending}
    >
      <p
        className="rounded-md bg-slate-50 px-2.5 py-1.5 text-sm text-slate-700"
        title="Saved as draft for office review"
      >
        <span className="font-semibold text-slate-900">{customerName}</span>
        <span className="text-slate-400"> · </span>
        <span className="font-semibold text-slate-900">{jobNumber}</span>
        <span className="text-slate-400"> · </span>
        <span className="text-xs text-slate-500">Draft</span>
      </p>

      <LineItemsEditor
        lineItems={lineItems}
        serviceItems={serviceItems}
        taxRate={defaultTaxRate}
        onChange={setLineItems}
      />

      <details className={adminDetailsClass}>
        <summary className={adminDetailsSummaryClass}>
          <span>Notes (optional)</span>
        </summary>
        <div className={adminDetailsBodyClass}>
          <label htmlFor="tech-estimate-notes" className="sr-only">
            Notes
          </label>
          <textarea
            id="tech-estimate-notes"
            rows={2}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Site notes for office"
            disabled={isPending}
            className={adminFormInputClass}
          />
        </div>
      </details>

      {error ? (
        <p className="text-sm text-red-600" role="alert" aria-live="polite">
          {error}
        </p>
      ) : null}

      <button type="button" onClick={onCancel} className="sr-only">
        Cancel
      </button>
    </form>
  );
}
