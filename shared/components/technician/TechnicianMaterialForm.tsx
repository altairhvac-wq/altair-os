"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useRouter } from "next/navigation";
import { createJobMaterialAction } from "@/app/actions/job-materials";
import { formatActionError, formatRetryGuidance } from "@/shared/lib/operational-errors";
import { formatCurrency } from "@/shared/types/customer";
import type { JobMaterialFormData } from "@/shared/types/job-material";
import type { ServiceItem } from "@/shared/types/service-item";

type TechnicianMaterialFormProps = {
  jobId: string;
  jobNumber?: string;
  serviceItems: ServiceItem[];
  onSuccess?: () => void;
  onCancel: () => void;
  onSubmittingChange?: (isSubmitting: boolean) => void;
};

const CUSTOM_SERVICE_ITEM_ID = "";

const inputClass =
  "w-full min-h-11 rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-base text-slate-900 placeholder:text-slate-400 outline-none transition-colors focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 sm:text-sm";

const numericInputClass = `${inputClass} tabular-nums`;

const labelClass = "mb-1.5 block text-xs font-semibold text-slate-600";

export function TechnicianMaterialForm({
  jobId,
  jobNumber,
  serviceItems,
  onSuccess,
  onCancel,
  onSubmittingChange,
}: TechnicianMaterialFormProps) {
  const router = useRouter();
  const submitLockRef = useRef(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [selectedServiceItemId, setSelectedServiceItemId] = useState(
    CUSTOM_SERVICE_ITEM_ID,
  );
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [unitCost, setUnitCost] = useState("");
  const [unitPrice, setUnitPrice] = useState("");
  const [taxable, setTaxable] = useState(true);

  useEffect(() => {
    onSubmittingChange?.(isPending);
  }, [isPending, onSubmittingChange]);

  function resetForm() {
    setSelectedServiceItemId(CUSTOM_SERVICE_ITEM_ID);
    setName("");
    setDescription("");
    setQuantity("1");
    setUnitCost("");
    setUnitPrice("");
    setTaxable(true);
    setShowAdvanced(false);
    setError(null);
  }

  function handleServiceItemChange(serviceItemId: string) {
    setSelectedServiceItemId(serviceItemId);

    if (!serviceItemId) {
      setName("");
      setDescription("");
      setQuantity("1");
      setUnitCost("");
      setUnitPrice("");
      setTaxable(true);
      return;
    }

    const serviceItem = serviceItems.find(
      (candidate) => candidate.id === serviceItemId,
    );

    if (!serviceItem) {
      return;
    }

    setName(serviceItem.name);
    setDescription(serviceItem.description ?? "");
    setQuantity("1");
    setUnitCost("");
    setUnitPrice(String(serviceItem.unitPrice));
    setTaxable(serviceItem.taxable);
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (submitLockRef.current || isPending) {
      return;
    }

    setError(null);

    const trimmedName = name.trim();

    if (!trimmedName) {
      setError("Material name is required.");
      return;
    }

    const parsedQuantity = parseFloat(quantity);

    if (!Number.isFinite(parsedQuantity) || parsedQuantity <= 0) {
      setError("Quantity must be greater than zero.");
      return;
    }

    const trimmedUnitCost = unitCost.trim();
    let parsedUnitCost: number | null = null;

    if (trimmedUnitCost) {
      parsedUnitCost = parseFloat(trimmedUnitCost);

      if (!Number.isFinite(parsedUnitCost) || parsedUnitCost < 0) {
        setError("Cost cannot be negative.");
        return;
      }
    }

    const trimmedUnitPrice = unitPrice.trim();
    let parsedUnitPrice: number;

    if (trimmedUnitPrice) {
      parsedUnitPrice = parseFloat(trimmedUnitPrice);

      if (!Number.isFinite(parsedUnitPrice) || parsedUnitPrice < 0) {
        setError("Billable price cannot be negative.");
        return;
      }
    } else if (parsedUnitCost != null) {
      parsedUnitPrice = parsedUnitCost;
    } else {
      setError("Enter a cost or billable price.");
      return;
    }

    const data: JobMaterialFormData = {
      jobId,
      serviceItemId: selectedServiceItemId || undefined,
      name: trimmedName,
      description: description.trim() || undefined,
      quantity: parsedQuantity,
      unitCost: parsedUnitCost,
      unitPrice: parsedUnitPrice,
      taxable,
    };

    submitLockRef.current = true;

    startTransition(async () => {
      const result = await createJobMaterialAction({ data });

      if (result.error) {
        setError(formatRetryGuidance(formatActionError(result.error, "Could not log this material. Try again.")));
        submitLockRef.current = false;
        return;
      }

      resetForm();
      onSuccess?.();
      router.refresh();
    });
  }

  return (
    <form
      id="technician-material-form"
      onSubmit={handleSubmit}
      className="space-y-4"
      aria-busy={isPending}
    >
      {jobNumber ? (
        <div className="rounded-xl bg-white px-3.5 py-2.5 text-sm text-slate-600">
          Linked to{" "}
          <span className="font-semibold text-slate-900">{jobNumber}</span>
        </div>
      ) : null}

      <div>
        <label htmlFor="tech-material-name" className={labelClass}>
          What did you use?
        </label>
        <input
          id="tech-material-name"
          type="text"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="e.g. 3/4&quot; copper fitting"
          disabled={isPending}
          required
          autoComplete="off"
          enterKeyHint="next"
          className={inputClass}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="tech-material-quantity" className={labelClass}>
            Qty
          </label>
          <input
            id="tech-material-quantity"
            type="number"
            inputMode="decimal"
            min="0.01"
            step="0.01"
            value={quantity}
            onChange={(event) => setQuantity(event.target.value)}
            disabled={isPending}
            required
            enterKeyHint="next"
            className={numericInputClass}
          />
        </div>
        <div>
          <label htmlFor="tech-material-unit-cost" className={labelClass}>
            Cost each
          </label>
          <input
            id="tech-material-unit-cost"
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            value={unitCost}
            onChange={(event) => setUnitCost(event.target.value)}
            placeholder="0.00"
            disabled={isPending}
            enterKeyHint="done"
            className={numericInputClass}
          />
        </div>
      </div>

      <button
        type="button"
        onClick={() => setShowAdvanced((current) => !current)}
        disabled={isPending}
        className="flex min-h-11 w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100 disabled:opacity-60"
        aria-expanded={showAdvanced}
      >
        <span>More options</span>
        {showAdvanced ? (
          <ChevronUp className="h-4 w-4 text-slate-400" />
        ) : (
          <ChevronDown className="h-4 w-4 text-slate-400" />
        )}
      </button>

      {showAdvanced ? (
        <div className="space-y-4 rounded-xl border border-slate-100 bg-white p-3.5">
          {serviceItems.length > 0 ? (
            <div>
              <label htmlFor="tech-material-service-item" className={labelClass}>
                Price book item
              </label>
              <select
                id="tech-material-service-item"
                value={selectedServiceItemId}
                onChange={(event) =>
                  handleServiceItemChange(event.target.value)
                }
                disabled={isPending}
                className={inputClass}
              >
                <option value={CUSTOM_SERVICE_ITEM_ID}>Custom material</option>
                {serviceItems.map((serviceItem) => (
                  <option key={serviceItem.id} value={serviceItem.id}>
                    {serviceItem.name} — {formatCurrency(serviceItem.unitPrice)}
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          <div>
            <label htmlFor="tech-material-unit-price" className={labelClass}>
              Billable price each
            </label>
            <input
              id="tech-material-unit-price"
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              value={unitPrice}
              onChange={(event) => setUnitPrice(event.target.value)}
              placeholder={
                unitCost.trim() ? "Defaults to cost" : "Required if no cost"
              }
              disabled={isPending}
              className={numericInputClass}
            />
            <p className="mt-1 text-xs text-slate-500">
              Leave blank to bill at cost.
            </p>
          </div>

          <div>
            <label htmlFor="tech-material-description" className={labelClass}>
              Notes{" "}
              <span className="font-normal text-slate-400">(optional)</span>
            </label>
            <input
              id="tech-material-description"
              type="text"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Optional details"
              disabled={isPending}
              className={inputClass}
            />
          </div>
        </div>
      ) : null}

      {error ? (
        <p className="text-sm text-red-600" role="alert" aria-live="polite">
          {error}
        </p>
      ) : null}
    </form>
  );
}
