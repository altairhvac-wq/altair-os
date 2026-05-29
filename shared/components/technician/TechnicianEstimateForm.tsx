"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createFieldEstimateFromJobAction } from "@/app/actions/estimates";
import { LineItemsEditor } from "@/shared/components/estimates/LineItemsEditor";
import { formatActionError, formatRetryGuidance } from "@/shared/lib/operational-errors";
import type { EstimateLineItemFormData } from "@/shared/types/estimate";
import type { ServiceItem } from "@/shared/types/service-item";

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

const inputClass =
  "w-full min-h-11 rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-base text-slate-900 placeholder:text-slate-400 outline-none transition-colors focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 sm:text-sm";

const labelClass = "mb-1.5 block text-xs font-semibold text-slate-600";

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
      className="min-w-0 space-y-4"
      aria-busy={isPending}
    >
      <div className="space-y-2 rounded-xl bg-slate-50 px-3.5 py-3 text-sm text-slate-700">
        <p>
          Customer{" "}
          <span className="font-semibold text-slate-900">{customerName}</span>
        </p>
        <p>
          Job{" "}
          <span className="font-semibold text-slate-900">{jobNumber}</span>
        </p>
        <p className="text-xs text-slate-500">
          Saved as a draft for office review. Nothing is sent to the customer.
        </p>
      </div>

      <LineItemsEditor
        lineItems={lineItems}
        serviceItems={serviceItems}
        taxRate={defaultTaxRate}
        onChange={setLineItems}
      />

      <div>
        <label htmlFor="tech-estimate-notes" className={labelClass}>
          Notes{" "}
          <span className="font-normal text-slate-400">(optional)</span>
        </label>
        <textarea
          id="tech-estimate-notes"
          rows={3}
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          placeholder="Site notes for the office"
          disabled={isPending}
          className={inputClass}
        />
      </div>

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
