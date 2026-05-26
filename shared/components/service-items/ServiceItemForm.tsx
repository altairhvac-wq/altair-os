"use client";

import {
  type ServiceItem,
  type ServiceItemFormData,
} from "@/shared/types/service-item";

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
  unitPrice: 0,
  taxable: true,
  category: "",
  isActive: true,
};

const inputClass =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-colors focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20";

const labelClass = "mb-1.5 block text-xs font-semibold text-slate-600";

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

    onSubmit({
      name: String(form.get("name") ?? ""),
      description: String(form.get("description") ?? ""),
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
          className={inputClass}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
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
          <label htmlFor="unitPrice" className={labelClass}>
            Unit price
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

      <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-3">
        <label className="inline-flex items-center gap-2 text-sm font-medium text-slate-700">
          <input
            type="checkbox"
            name="taxable"
            defaultChecked={defaults.taxable}
            className="rounded border-slate-300 text-cyan-600 focus:ring-cyan-500/20"
          />
          Taxable by default
        </label>

        <label className="inline-flex items-center gap-2 text-sm font-medium text-slate-700">
          <input
            type="checkbox"
            name="isActive"
            defaultChecked={defaults.isActive}
            className="rounded border-slate-300 text-cyan-600 focus:ring-cyan-500/20"
          />
          Active in price book
        </label>
      </div>

      <div className="flex gap-2 border-t border-slate-100 pt-4">
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex-1 rounded-lg bg-cyan-600 px-3 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-cyan-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? "Saving..." : submitLabel}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className="flex-1 rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

export function serviceItemToFormData(item: ServiceItem): ServiceItemFormData {
  return {
    name: item.name,
    description: item.description ?? "",
    unitPrice: item.unitPrice,
    taxable: item.taxable,
    category: item.category ?? "",
    isActive: item.isActive,
  };
}
