import { useState } from "react";
import {
  ESTIMATE_STATUS_OPTIONS,
  type EstimateFormData,
  type EstimateLineItemFormData,
  type EstimateStatus,
} from "@/shared/types/estimate";
import { LineItemsEditor } from "./LineItemsEditor";

type EstimateFormProps = {
  initialData?: Partial<EstimateFormData>;
  onSubmit: (data: EstimateFormData) => void;
  onCancel: () => void;
};

const emptyForm: EstimateFormData = {
  customerName: "",
  status: "draft",
  validUntil: "",
  notes: "",
  lineItems: [{ description: "", quantity: 1, unitPrice: 0 }],
};

const inputClass =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-colors focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20";

const labelClass = "mb-1.5 block text-xs font-semibold text-slate-600";

export function EstimateForm({ initialData, onSubmit, onCancel }: EstimateFormProps) {
  const defaults = { ...emptyForm, ...initialData };
  const [lineItems, setLineItems] = useState<EstimateLineItemFormData[]>(
    defaults.lineItems,
  );

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);

    const validLineItems = lineItems.filter(
      (item) => item.description.trim() && item.quantity > 0,
    );

    if (validLineItems.length === 0) return;

    onSubmit({
      customerName: String(form.get("customerName") ?? ""),
      status: String(form.get("status") ?? "draft") as EstimateStatus,
      validUntil: String(form.get("validUntil") ?? ""),
      notes: String(form.get("notes") ?? ""),
      lineItems: validLineItems,
    });
  }

  const statusOptions = ESTIMATE_STATUS_OPTIONS.filter(
    (option) => option.value !== "all",
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label htmlFor="customerName" className={labelClass}>
            Customer name
          </label>
          <input
            id="customerName"
            name="customerName"
            required
            defaultValue={defaults.customerName}
            placeholder="Jane Smith"
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="status" className={labelClass}>
            Status
          </label>
          <select
            id="status"
            name="status"
            defaultValue={defaults.status}
            className={inputClass}
          >
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="validUntil" className={labelClass}>
            Valid until
          </label>
          <input
            id="validUntil"
            name="validUntil"
            type="date"
            defaultValue={defaults.validUntil}
            className={inputClass}
          />
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="notes" className={labelClass}>
            Notes
          </label>
          <textarea
            id="notes"
            name="notes"
            rows={3}
            defaultValue={defaults.notes}
            placeholder="Optional notes for the customer or team"
            className={inputClass}
          />
        </div>
      </div>

      <LineItemsEditor lineItems={lineItems} onChange={setLineItems} />

      <div className="flex gap-2 border-t border-slate-100 pt-4">
        <button
          type="submit"
          className="flex-1 rounded-lg bg-cyan-600 px-3 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-cyan-700"
        >
          Save estimate
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
