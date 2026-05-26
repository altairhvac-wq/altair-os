"use client";

import { useMemo, useState } from "react";
import {
  ESTIMATE_STATUS_OPTIONS,
  getDefaultValidUntilDate,
  type EstimateFormData,
  type EstimateLineItemFormData,
  type EstimateStatus,
} from "@/shared/types/estimate";
import type { Customer } from "@/shared/types/customer";
import type { Job } from "@/shared/types/job";
import type { ServiceItem } from "@/shared/types/service-item";
import { LineItemsEditor } from "./LineItemsEditor";

type EstimateFormProps = {
  customers: Customer[];
  jobs: Job[];
  serviceItems: ServiceItem[];
  initialData?: Partial<EstimateFormData>;
  onSubmit: (data: EstimateFormData) => void;
  onCancel: () => void;
  error?: string | null;
  isSubmitting?: boolean;
};

const emptyLineItem: EstimateLineItemFormData = {
  name: "",
  description: "",
  quantity: 1,
  unitPrice: 0,
  taxable: true,
};

const emptyForm: EstimateFormData = {
  customerId: "",
  jobId: "",
  status: "draft",
  validUntil: getDefaultValidUntilDate(),
  notes: "",
  taxRate: 0,
  lineItems: [{ ...emptyLineItem }],
};

const inputClass =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-colors focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20";

const labelClass = "mb-1.5 block text-xs font-semibold text-slate-600";

export function EstimateForm({
  customers,
  jobs,
  serviceItems,
  initialData,
  onSubmit,
  onCancel,
  error,
  isSubmitting = false,
}: EstimateFormProps) {
  const defaults = useMemo(
    () => ({
      ...emptyForm,
      ...initialData,
      validUntil: initialData?.validUntil || getDefaultValidUntilDate(),
    }),
    [initialData],
  );
  const [customerId, setCustomerId] = useState(defaults.customerId);
  const [jobId, setJobId] = useState(defaults.jobId ?? "");
  const [taxRate, setTaxRate] = useState(defaults.taxRate);
  const [lineItems, setLineItems] = useState<EstimateLineItemFormData[]>(
    defaults.lineItems,
  );

  const customerJobs = useMemo(
    () => jobs.filter((job) => job.customerId === customerId),
    [jobs, customerId],
  );

  function handleCustomerChange(nextCustomerId: string) {
    setCustomerId(nextCustomerId);
    setJobId("");
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);

    const validLineItems = lineItems.filter(
      (item) =>
        (item.name.trim().length > 0 || item.description.trim().length > 0) &&
        item.quantity > 0,
    );

    if (validLineItems.length === 0) return;

    const taxRateValue = parseFloat(String(form.get("taxRate") ?? "0"));

    onSubmit({
      customerId,
      jobId: jobId.trim() || undefined,
      status: String(form.get("status") ?? "draft") as EstimateStatus,
      validUntil: String(form.get("validUntil") ?? defaults.validUntil),
      notes: String(form.get("notes") ?? ""),
      taxRate: Number.isNaN(taxRateValue) ? 0 : taxRateValue,
      lineItems: validLineItems,
    });
  }

  const statusOptions = ESTIMATE_STATUS_OPTIONS.filter(
    (option) => option.value !== "all",
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label htmlFor="customerId" className={labelClass}>
            Customer
          </label>
          <select
            id="customerId"
            name="customerId"
            required
            value={customerId}
            onChange={(e) => handleCustomerChange(e.target.value)}
            className={inputClass}
          >
            <option value="">Select a customer</option>
            {customers.map((customer) => (
              <option key={customer.id} value={customer.id}>
                {customer.name}
              </option>
            ))}
          </select>
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="jobId" className={labelClass}>
            Linked job (optional)
          </label>
          <select
            id="jobId"
            name="jobId"
            value={jobId}
            onChange={(e) => setJobId(e.target.value)}
            disabled={!customerId}
            className={inputClass}
          >
            <option value="">No linked job</option>
            {customerJobs.map((job) => (
              <option key={job.id} value={job.id}>
                {job.jobNumber}
              </option>
            ))}
          </select>
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
          <p className="mt-1 text-xs text-slate-500">
            Defaults to 30 days from today
          </p>
        </div>

        <div>
          <label htmlFor="taxRate" className={labelClass}>
            Tax rate (%)
          </label>
          <input
            id="taxRate"
            name="taxRate"
            type="number"
            min="0"
            max="100"
            step="0.01"
            value={taxRate || ""}
            onChange={(e) => {
              const nextTaxRate = parseFloat(e.target.value);
              setTaxRate(Number.isNaN(nextTaxRate) ? 0 : nextTaxRate);
            }}
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

      <LineItemsEditor
        lineItems={lineItems}
        serviceItems={serviceItems}
        taxRate={taxRate}
        onChange={setLineItems}
      />

      <div className="flex gap-2 border-t border-slate-100 pt-4">
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex-1 rounded-lg bg-cyan-600 px-3 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-cyan-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? "Saving..." : "Save estimate"}
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
