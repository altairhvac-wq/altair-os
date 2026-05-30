"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { createJobMaterialAction } from "@/app/actions/job-materials";
import { formatActionError } from "@/shared/lib/operational-errors";
import { formatCurrency } from "@/shared/types/customer";
import type { JobMaterialFormData } from "@/shared/types/job-material";
import type { ServiceItem } from "@/shared/types/service-item";

type JobMaterialFormProps = {
  jobId: string;
  serviceItems: ServiceItem[];
  onSuccess?: () => void;
};

const CUSTOM_SERVICE_ITEM_ID = "";

const inputClass =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-colors focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20";

const labelClass = "mb-1 block text-xs font-semibold text-slate-600";

export function JobMaterialForm({
  jobId,
  serviceItems,
  onSuccess,
}: JobMaterialFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [selectedServiceItemId, setSelectedServiceItemId] = useState(
    CUSTOM_SERVICE_ITEM_ID,
  );
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [unitCost, setUnitCost] = useState("");
  const [unitPrice, setUnitPrice] = useState("");
  const [taxable, setTaxable] = useState(true);

  function resetForm() {
    setSelectedServiceItemId(CUSTOM_SERVICE_ITEM_ID);
    setName("");
    setDescription("");
    setQuantity("1");
    setUnitCost("");
    setUnitPrice("");
    setTaxable(true);
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

    if (isPending) {
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

    const trimmedUnitPrice = unitPrice.trim();

    if (!trimmedUnitPrice) {
      setError("Unit price is required.");
      return;
    }

    const parsedUnitPrice = parseFloat(trimmedUnitPrice);

    if (!Number.isFinite(parsedUnitPrice) || parsedUnitPrice < 0) {
      setError("Unit price cannot be negative.");
      return;
    }

    const trimmedUnitCost = unitCost.trim();
    let parsedUnitCost: number | null = null;

    if (trimmedUnitCost) {
      parsedUnitCost = parseFloat(trimmedUnitCost);

      if (!Number.isFinite(parsedUnitCost) || parsedUnitCost < 0) {
        setError("Unit cost cannot be negative.");
        return;
      }
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

    startTransition(async () => {
      const result = await createJobMaterialAction({ data });

      if (result.error) {
        setError(formatActionError(result.error, "Could not log this material. Try again."));
        return;
      }

      resetForm();
      onSuccess?.();
      router.refresh();
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border border-slate-200 bg-white p-4"
    >
      <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        Log material
      </h3>

      <div className="mt-3 space-y-3">
        <div>
          <label htmlFor={`material-service-item-${jobId}`} className={labelClass}>
            Price book item
          </label>
          <select
            id={`material-service-item-${jobId}`}
            value={selectedServiceItemId}
            onChange={(event) => handleServiceItemChange(event.target.value)}
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
          {serviceItems.length === 0 ? (
            <p className="mt-1 text-xs text-slate-500">
              No price book items yet. Enter a custom material name below.
            </p>
          ) : null}
        </div>

        <div>
          <label htmlFor={`material-name-${jobId}`} className={labelClass}>
            Material name
          </label>
          <input
            id={`material-name-${jobId}`}
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Part or supply used on this job"
            disabled={isPending}
            required
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor={`material-description-${jobId}`} className={labelClass}>
            Description
          </label>
          <input
            id={`material-description-${jobId}`}
            type="text"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Optional details"
            disabled={isPending}
            className={inputClass}
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <label htmlFor={`material-quantity-${jobId}`} className={labelClass}>
              Quantity
            </label>
            <input
              id={`material-quantity-${jobId}`}
              type="number"
              min="0.01"
              step="0.01"
              value={quantity}
              onChange={(event) => setQuantity(event.target.value)}
              disabled={isPending}
              required
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor={`material-unit-cost-${jobId}`} className={labelClass}>
              Unit cost
            </label>
            <input
              id={`material-unit-cost-${jobId}`}
              type="number"
              min="0"
              step="0.01"
              value={unitCost}
              onChange={(event) => setUnitCost(event.target.value)}
              placeholder="Optional"
              disabled={isPending}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor={`material-unit-price-${jobId}`} className={labelClass}>
              Unit price
            </label>
            <input
              id={`material-unit-price-${jobId}`}
              type="number"
              min="0"
              step="0.01"
              value={unitPrice}
              onChange={(event) => setUnitPrice(event.target.value)}
              disabled={isPending}
              required
              className={inputClass}
            />
          </div>
        </div>
      </div>

      {error ? (
        <p className="mt-3 text-sm text-red-600" role="alert" aria-live="polite">
          {error}
        </p>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
        <button
          type="button"
          onClick={resetForm}
          disabled={isPending}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-60"
        >
          Clear
        </button>
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex items-center gap-2 rounded-lg bg-cyan-600 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-cyan-700 disabled:opacity-60"
        >
          {isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            "Log material"
          )}
        </button>
      </div>
    </form>
  );
}
