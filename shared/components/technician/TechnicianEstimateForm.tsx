"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createFieldEstimateFromJobAction,
  getFieldEstimateDraftAction,
  updateFieldEstimateFromJobAction,
} from "@/app/actions/estimates";
import { EstimateDescriptionAiAssistant } from "@/shared/components/estimates/EstimateDescriptionAiAssistant";
import { LineItemsEditor } from "@/shared/components/estimates/LineItemsEditor";
import { formatActionError, formatRetryGuidance } from "@/shared/lib/operational-errors";
import type { EstimateLineItemFormData } from "@/shared/types/estimate";
import type { ServiceItem } from "@/shared/types/service-item";
import {
  adminFormInputClass,
  adminFormStackClass,
} from "@/shared/lib/admin-density";

type TechnicianEstimateFormProps = {
  jobId: string;
  jobNumber: string;
  customerName: string;
  jobType?: string;
  jobTitle?: string;
  /** When set, continues the existing draft instead of creating a new estimate. */
  estimateId?: string;
  serviceItems: ServiceItem[];
  defaultTaxRate: number;
  aiFeaturesEnabled?: boolean;
  canDraftDescription?: boolean;
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
  jobType,
  jobTitle,
  estimateId,
  serviceItems,
  defaultTaxRate,
  aiFeaturesEnabled = false,
  canDraftDescription = true,
  onSuccess,
  onCancel,
  onSubmittingChange,
}: TechnicianEstimateFormProps) {
  const router = useRouter();
  const submitLockRef = useRef(false);
  const [isPending, startTransition] = useTransition();
  const [isLoadingDraft, setIsLoadingDraft] = useState(Boolean(estimateId));
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [lineItems, setLineItems] = useState<EstimateLineItemFormData[]>([
    { ...emptyLineItem },
  ]);

  useEffect(() => {
    onSubmittingChange?.(isPending || isLoadingDraft);
  }, [isPending, isLoadingDraft, onSubmittingChange]);

  useEffect(() => {
    if (!estimateId) {
      return;
    }

    let cancelled = false;

    void getFieldEstimateDraftAction(jobId, estimateId).then((result) => {
      if (cancelled) {
        return;
      }

      if (result.error || !result.estimate) {
        setError(
          formatRetryGuidance(
            formatActionError(
              result.error,
              "Could not load this draft estimate. Try again.",
            ),
          ),
        );
        setIsLoadingDraft(false);
        return;
      }

      setNotes(result.estimate.notes ?? "");
      setLineItems(
        result.estimate.lineItems.length > 0
          ? result.estimate.lineItems.map((item) => ({
              serviceItemId: item.serviceItemId,
              name: item.name,
              description: item.description ?? "",
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              taxable: item.taxable,
            }))
          : [{ ...emptyLineItem }],
      );
      setIsLoadingDraft(false);
    });

    return () => {
      cancelled = true;
    };
  }, [estimateId, jobId]);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isPending || isLoadingDraft || submitLockRef.current) {
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
      const result = estimateId
        ? await updateFieldEstimateFromJobAction(jobId, estimateId, {
            lineItems: validLineItems,
            notes,
          })
        : await createFieldEstimateFromJobAction(jobId, {
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

  if (isLoadingDraft) {
    return (
      <div className={`min-w-0 ${adminFormStackClass}`} aria-busy>
        <p className="rounded-md bg-white px-2.5 py-1.5 text-sm text-slate-600">
          Loading draft estimate…
        </p>
      </div>
    );
  }

  return (
    <form
      id="technician-estimate-form"
      onSubmit={handleSubmit}
      className={`min-w-0 ${adminFormStackClass}`}
      aria-busy={isPending}
    >
      <p
        className="rounded-md bg-white px-2.5 py-1.5 text-sm text-slate-700"
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

      <div className="rounded-lg border border-slate-200 bg-white p-2.5">
        <label htmlFor="tech-estimate-notes" className="mb-0.5 block text-[11px] font-semibold leading-tight text-slate-600">
          Notes / Description
        </label>
        <textarea
          id="tech-estimate-notes"
          rows={3}
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          placeholder="Rough site notes — rewrite with AI for a customer-facing description"
          disabled={isPending}
          className={`${adminFormInputClass} mt-1`}
        />
        <EstimateDescriptionAiAssistant
          notes={notes}
          onNotesChange={setNotes}
          lineItems={lineItems}
          customerName={customerName}
          jobType={jobType}
          jobTitle={jobTitle}
          jobNumber={jobNumber}
          jobId={jobId}
          aiFeaturesEnabled={aiFeaturesEnabled}
          canDraft={canDraftDescription}
          disabled={isPending}
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
