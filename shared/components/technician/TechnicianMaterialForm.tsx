"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useRouter } from "next/navigation";
import { createJobMaterialAction } from "@/app/actions/job-materials";
import { ServiceItemMaterialPicker } from "@/shared/components/service-items/ServiceItemMaterialPicker";
import {
  formatActionError,
  formatConnectionCatchError,
  formatPreservedFormError,
  formatRetryGuidance,
} from "@/shared/lib/operational-errors";
import { formatCurrency } from "@/shared/types/customer";
import {
  calculateJobMaterialTotalBillable,
  type JobMaterialFormData,
} from "@/shared/types/job-material";
import type { ServiceItem } from "@/shared/types/service-item";

type TechnicianMaterialFormProps = {
  jobId: string;
  jobNumber?: string;
  serviceItems: ServiceItem[];
  onSuccess?: () => void;
  onCancel: () => void;
  onSubmittingChange?: (isSubmitting: boolean) => void;
};

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
  const [selectedServiceItemId, setSelectedServiceItemId] = useState<
    string | null
  >(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [unitCost, setUnitCost] = useState("");
  const [unitPrice, setUnitPrice] = useState("");
  const [taxable, setTaxable] = useState(true);

  const isCustomMaterial = selectedServiceItemId == null;
  const parsedQuantity = parseFloat(quantity);
  const parsedUnitPrice = unitPrice.trim() ? parseFloat(unitPrice) : NaN;
  const parsedUnitCost = unitCost.trim() ? parseFloat(unitCost) : NaN;
  const previewUnitPrice = isCustomMaterial
    ? Number.isFinite(parsedUnitPrice)
      ? parsedUnitPrice
      : Number.isFinite(parsedUnitCost)
        ? parsedUnitCost
        : NaN
    : parsedUnitPrice;
  const hasValidPreview =
    Number.isFinite(parsedQuantity) &&
    parsedQuantity > 0 &&
    Number.isFinite(previewUnitPrice) &&
    previewUnitPrice >= 0;

  useEffect(() => {
    onSubmittingChange?.(isPending);
  }, [isPending, onSubmittingChange]);

  function resetForm() {
    setSelectedServiceItemId(null);
    setName("");
    setDescription("");
    setQuantity("1");
    setUnitCost("");
    setUnitPrice("");
    setTaxable(true);
    setShowAdvanced(false);
    setError(null);
  }

  function handleServiceItemSelect(serviceItemId: string | null) {
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

    if (!Number.isFinite(parsedQuantity) || parsedQuantity <= 0) {
      setError("Quantity must be greater than zero.");
      return;
    }

    const trimmedUnitCost = unitCost.trim();
    let parsedUnitCost: number | null = null;

    if (isCustomMaterial && trimmedUnitCost) {
      parsedUnitCost = parseFloat(trimmedUnitCost);

      if (!Number.isFinite(parsedUnitCost) || parsedUnitCost < 0) {
        setError("Cost cannot be negative.");
        return;
      }
    }

    const trimmedUnitPrice = unitPrice.trim();
    let resolvedUnitPrice: number;

    if (trimmedUnitPrice) {
      resolvedUnitPrice = parseFloat(trimmedUnitPrice);

      if (!Number.isFinite(resolvedUnitPrice) || resolvedUnitPrice < 0) {
        setError("Billable price cannot be negative.");
        return;
      }
    } else if (isCustomMaterial && parsedUnitCost != null) {
      resolvedUnitPrice = parsedUnitCost;
    } else if (!isCustomMaterial) {
      setError("Customer charge is required for this price book item.");
      return;
    } else {
      setError("Enter a cost or billable price.");
      return;
    }

    const data: JobMaterialFormData = {
      jobId,
      serviceItemId: selectedServiceItemId ?? undefined,
      name: trimmedName,
      description: description.trim() || undefined,
      quantity: parsedQuantity,
      unitCost: isCustomMaterial ? parsedUnitCost : null,
      unitPrice: resolvedUnitPrice,
      taxable,
    };

    submitLockRef.current = true;

    startTransition(async () => {
      try {
        const result = await createJobMaterialAction({ data });

        if (result.error) {
          setError(
            formatPreservedFormError(
              formatRetryGuidance(
                formatActionError(
                  result.error,
                  "Could not log this material. Try again.",
                ),
              ),
            ),
          );
          return;
        }

        resetForm();
        onSuccess?.();
        router.refresh();
      } catch {
        setError(
          formatPreservedFormError(
            formatConnectionCatchError(
              "Connection problem. Could not log this material.",
            ),
          ),
        );
      } finally {
        submitLockRef.current = false;
      }
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

      <ServiceItemMaterialPicker
        serviceItems={serviceItems}
        selectedServiceItemId={selectedServiceItemId}
        onSelect={handleServiceItemSelect}
        disabled={isPending}
        inputClass={inputClass}
        labelClass={labelClass}
      />

      <div>
        <label htmlFor="tech-material-name" className={labelClass}>
          {isCustomMaterial ? "What did you use?" : "Material"}
        </label>
        <input
          id="tech-material-name"
          type="text"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="e.g. 3/4&quot; copper fitting"
          disabled={isPending || !isCustomMaterial}
          readOnly={!isCustomMaterial}
          required
          autoComplete="off"
          enterKeyHint="next"
          className={`${inputClass} ${!isCustomMaterial ? "bg-slate-50 text-slate-700" : ""}`}
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
          <label htmlFor="tech-material-unit-price" className={labelClass}>
            {isCustomMaterial ? "Cost each" : "Customer charge each"}
          </label>
          <input
            id="tech-material-unit-price"
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            value={isCustomMaterial ? unitCost : unitPrice}
            onChange={(event) =>
              isCustomMaterial
                ? setUnitCost(event.target.value)
                : setUnitPrice(event.target.value)
            }
            placeholder="0.00"
            disabled={isPending}
            enterKeyHint="done"
            className={numericInputClass}
          />
        </div>
      </div>

      {hasValidPreview ? (
        <p className="text-xs text-slate-500">
          Total {isCustomMaterial ? "billable" : "customer charge"}:{" "}
          <span className="font-semibold text-slate-700">
            {formatCurrency(
              calculateJobMaterialTotalBillable({
                quantity: parsedQuantity,
                unitPrice: previewUnitPrice,
              }),
            )}
          </span>
        </p>
      ) : null}

      {isCustomMaterial ? (
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
      ) : null}

      {isCustomMaterial && showAdvanced ? (
        <div className="space-y-4 rounded-xl border border-slate-100 bg-white p-3.5">
          <div>
            <label htmlFor="tech-material-billable-price" className={labelClass}>
              Billable price each
            </label>
            <input
              id="tech-material-billable-price"
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
