"use client";

import { useMemo, useState } from "react";
import {
  getDefaultDueDate,
  getDefaultIssueDate,
  INVOICE_CREATE_STATUS,
  type InvoiceFormData,
  type InvoiceLineItemFormData,
} from "@/shared/types/invoice";
import type { Customer } from "@/shared/types/customer";
import type { Job } from "@/shared/types/job";
import type { ServiceItem } from "@/shared/types/service-item";
import {
  adminFormActionsClass,
  adminFormGridClass,
  adminFormInputClass,
  adminFormLabelClass,
  adminFormStackClass,
} from "@/shared/lib/admin-density";
import { InvoiceLineItemsEditor } from "./InvoiceLineItemsEditor";

type InvoiceFormProps = {
  customers: Customer[];
  jobs: Job[];
  serviceItems: ServiceItem[];
  initialData?: Partial<InvoiceFormData>;
  onSubmit: (data: InvoiceFormData) => void;
  onCancel: () => void;
  error?: string | null;
  isSubmitting?: boolean;
};

const emptyLineItem: InvoiceLineItemFormData = {
  name: "",
  description: "",
  quantity: 1,
  unitPrice: 0,
  taxable: true,
};

const emptyForm: InvoiceFormData = {
  customerId: "",
  jobId: "",
  status: "draft",
  issueDate: getDefaultIssueDate(),
  dueDate: getDefaultDueDate(),
  notes: "",
  taxRate: 0,
  lineItems: [{ ...emptyLineItem }],
};

export function InvoiceForm({
  customers,
  jobs,
  serviceItems,
  initialData,
  onSubmit,
  onCancel,
  error,
  isSubmitting = false,
}: InvoiceFormProps) {
  const defaults = useMemo(
    () => ({
      ...emptyForm,
      ...initialData,
      issueDate: initialData?.issueDate || getDefaultIssueDate(),
      dueDate: initialData?.dueDate || getDefaultDueDate(),
    }),
    [initialData],
  );
  const [customerId, setCustomerId] = useState(defaults.customerId);
  const [jobId, setJobId] = useState(defaults.jobId ?? "");
  const [taxRate, setTaxRate] = useState(defaults.taxRate);
  const [lineItems, setLineItems] = useState<InvoiceLineItemFormData[]>(
    defaults.lineItems,
  );

  const customerJobs = useMemo(
    () =>
      jobs.filter(
        (job) => job.customerId === customerId && job.status !== "cancelled",
      ),
    [jobs, customerId],
  );

  function handleCustomerChange(nextCustomerId: string) {
    setCustomerId(nextCustomerId);
    setJobId("");
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (isSubmitting) {
      return;
    }

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
      status: INVOICE_CREATE_STATUS,
      issueDate: String(form.get("issueDate") ?? defaults.issueDate),
      dueDate: String(form.get("dueDate") ?? defaults.dueDate),
      notes: String(form.get("notes") ?? ""),
      taxRate: Number.isNaN(taxRateValue) ? 0 : taxRateValue,
      lineItems: validLineItems,
    });
  }

  return (
    <form onSubmit={handleSubmit} className={adminFormStackClass} aria-busy={isSubmitting}>
      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <fieldset
        disabled={isSubmitting}
        className={`m-0 min-w-0 border-0 p-0 ${adminFormStackClass}`}
      >
      <div className={adminFormGridClass}>
        <div className="sm:col-span-2">
          <label htmlFor="customerId" className={adminFormLabelClass}>
            Customer
          </label>
          <select
            id="customerId"
            name="customerId"
            required
            value={customerId}
            onChange={(e) => handleCustomerChange(e.target.value)}
            className={adminFormInputClass}
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
          <label htmlFor="jobId" className={adminFormLabelClass}>
            Linked job (optional)
          </label>
          <select
            id="jobId"
            name="jobId"
            value={jobId}
            onChange={(e) => setJobId(e.target.value)}
            disabled={!customerId}
            className={adminFormInputClass}
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
          <label htmlFor="taxRate" className={adminFormLabelClass}>
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
            className={adminFormInputClass}
          />
        </div>

        <div>
          <label htmlFor="issueDate" className={adminFormLabelClass}>
            Issue date
          </label>
          <input
            id="issueDate"
            name="issueDate"
            type="date"
            defaultValue={defaults.issueDate}
            className={adminFormInputClass}
          />
        </div>

        <div>
          <label htmlFor="dueDate" className={adminFormLabelClass}>
            Due date
          </label>
          <input
            id="dueDate"
            name="dueDate"
            type="date"
            defaultValue={defaults.dueDate}
            className={adminFormInputClass}
          />
          <p className="mt-1 text-xs text-slate-500">
            Defaults to 30 days from issue date
          </p>
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="notes" className={adminFormLabelClass}>
            Notes
          </label>
          <textarea
            id="notes"
            name="notes"
            rows={2}
            defaultValue={defaults.notes}
            placeholder="Optional notes for the customer or team"
            className={adminFormInputClass}
          />
        </div>
      </div>

      <InvoiceLineItemsEditor
        lineItems={lineItems}
        serviceItems={serviceItems}
        taxRate={taxRate}
        onChange={setLineItems}
      />
      </fieldset>

      <div className={adminFormActionsClass}>
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex-1 min-h-11 rounded-lg bg-cyan-600 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-cyan-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? "Saving..." : "Save invoice"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className="flex-1 min-h-11 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
