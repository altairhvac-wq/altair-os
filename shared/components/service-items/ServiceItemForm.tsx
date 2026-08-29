"use client";

import {
  type ServiceItem,
  type ServiceItemFormData,
} from "@/shared/types/service-item";
import {
  Button,
  fieldCheckboxClass,
  fieldControlClass,
  fieldLabelClass,
  fieldTextareaClass,
} from "@/shared/design-system/components";

type ServiceItemFormProps = {
  initialData?: Partial<ServiceItemFormData>;
  onSubmit: (data: ServiceItemFormData) => void;
  onCancel: () => void;
  error?: string | null;
  isSubmitting?: boolean;
  submitLabel?: string;
};

const emptyForm: ServiceItemFormData = {
  name: "",
  description: "",
  unitCost: null,
  unitPrice: 0,
  taxable: true,
  category: "",
  isActive: true,
};

const inputClass = fieldControlClass;
const textareaClass = fieldTextareaClass;
const labelClass = fieldLabelClass;

export function ServiceItemForm({
  initialData,
  onSubmit,
  onCancel,
  error,
  isSubmitting = false,
  submitLabel = "Save item",
}: ServiceItemFormProps) {
  const defaults = { ...emptyForm, ...initialData };

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const unitPriceValue = parseFloat(String(form.get("unitPrice") ?? "0"));
    const unitCostRaw = String(form.get("unitCost") ?? "").trim();
    const unitCostValue = unitCostRaw ? parseFloat(unitCostRaw) : null;

    onSubmit({
      name: String(form.get("name") ?? ""),
      description: String(form.get("description") ?? ""),
      unitCost:
        unitCostValue == null || Number.isNaN(unitCostValue)
          ? null
          : unitCostValue,
      unitPrice: Number.isNaN(unitPriceValue) ? 0 : unitPriceValue,
      taxable: form.get("taxable") === "on",
      category: String(form.get("category") ?? ""),
      isActive: form.get("isActive") === "on",
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div>
        <label htmlFor="service-item-name" className={labelClass}>
          Service / part name
        </label>
        <input
          id="service-item-name"
          name="name"
          type="text"
          required
          autoComplete="off"
          defaultValue={defaults.name}
          placeholder="e.g. Diagnostic Fee, Capacitor Replacement"
          className={inputClass}
        />
      </div>

      <div>
        <label htmlFor="description" className={labelClass}>
          Description
        </label>
        <textarea
          id="description"
          name="description"
          rows={3}
          defaultValue={defaults.description}
          placeholder="Optional details shown on estimates"
          className={textareaClass}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label htmlFor="category" className={labelClass}>
            Category
          </label>
          <input
            id="category"
            name="category"
            type="text"
            defaultValue={defaults.category}
            placeholder="e.g. HVAC, Electrical"
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="unitCost" className={labelClass}>
            Internal unit cost
          </label>
          <input
            id="unitCost"
            name="unitCost"
            type="number"
            min="0"
            step="0.01"
            defaultValue={
              defaults.unitCost == null ? "" : defaults.unitCost || ""
            }
            placeholder="Optional"
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="unitPrice" className={labelClass}>
            Customer price
          </label>
          <input
            id="unitPrice"
            name="unitPrice"
            type="number"
            min="0"
            step="0.01"
            required
            defaultValue={defaults.unitPrice || ""}
            className={inputClass}
          />
        </div>
      </div>

      <div className="space-y-2 rounded-lg border border-slate-200 bg-white px-3 py-3">
        <label className="inline-flex items-center gap-2 text-sm font-medium text-slate-700">
          <input
            type="checkbox"
            name="taxable"
            defaultChecked={defaults.taxable}
            className={fieldCheckboxClass}
          />
          Taxable by default
        </label>

        <label className="inline-flex items-center gap-2 text-sm font-medium text-slate-700">
          <input
            type="checkbox"
            name="isActive"
            defaultChecked={defaults.isActive}
            className={fieldCheckboxClass}
          />
          Active in price book
        </label>
      </div>

      <div className="flex gap-2 border-t border-slate-100 pt-4">
        <Button
          type="submit"
          loading={isSubmitting}
          className="flex-1"
        >
          {isSubmitting ? "Saving…" : submitLabel}
        </Button>
        <Button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          variant="secondary"
          className="flex-1"
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}

export function serviceItemToFormData(item: ServiceItem): ServiceItemFormData {
  return {
    name: item.name,
    description: item.description ?? "",
    unitCost: item.unitCost ?? null,
    unitPrice: item.unitPrice,
    taxable: item.taxable,
    category: item.category ?? "",
    isActive: item.isActive,
  };
}
