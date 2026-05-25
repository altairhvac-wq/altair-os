import { useState } from "react";
import {
  INVOICE_STATUS_OPTIONS,
  type InvoiceFormData,
  type InvoiceLineItemFormData,
  type InvoiceStatus,
} from "@/shared/types/invoice";
import { InvoiceLineItemsEditor } from "./InvoiceLineItemsEditor";

type InvoiceFormProps = {
  initialData?: Partial<InvoiceFormData>;
  onSubmit: (data: InvoiceFormData) => void;
  onCancel: () => void;
};

const emptyForm: InvoiceFormData = {
  customerName: "",
  jobType: "",
  status: "draft",
  dueDate: "",
  tax: 0,
  notes: "",
  lineItems: [{ description: "", quantity: 1, unitPrice: 0 }],
};

const inputClass =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-colors focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20";

const labelClass = "mb-1.5 block text-xs font-semibold text-slate-600";

export function InvoiceForm({ initialData, onSubmit, onCancel }: InvoiceFormProps) {
  const defaults = { ...emptyForm, ...initialData };
  const [lineItems, setLineItems] = useState<InvoiceLineItemFormData[]>(
    defaults.lineItems,
  );
  const [tax, setTax] = useState(defaults.tax);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);

    const validLineItems = lineItems.filter(
      (item) => item.description.trim() && item.quantity > 0,
    );

    if (validLineItems.length === 0) return;

    onSubmit({
      customerName: String(form.get("customerName") ?? ""),
      jobType: String(form.get("jobType") ?? ""),
      status: String(form.get("status") ?? "draft") as InvoiceStatus,
      dueDate: String(form.get("dueDate") ?? ""),
      tax,
      notes: String(form.get("notes") ?? ""),
      lineItems: validLineItems,
    });
  }

  const statusOptions = INVOICE_STATUS_OPTIONS.filter(
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
          <label htmlFor="jobType" className={labelClass}>
            Job type
          </label>
          <input
            id="jobType"
            name="jobType"
            required
            defaultValue={defaults.jobType}
            placeholder="HVAC Maintenance"
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
          <label htmlFor="dueDate" className={labelClass}>
            Due date
          </label>
          <input
            id="dueDate"
            name="dueDate"
            type="date"
            required
            defaultValue={defaults.dueDate}
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

      <InvoiceLineItemsEditor
        lineItems={lineItems}
        tax={tax}
        onChange={setLineItems}
        onTaxChange={setTax}
      />

      <div className="flex gap-2 border-t border-slate-100 pt-4">
        <button
          type="submit"
          className="flex-1 rounded-lg bg-cyan-600 px-3 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-cyan-700"
        >
          Save invoice
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
