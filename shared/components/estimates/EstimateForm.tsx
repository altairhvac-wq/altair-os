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
import {
  adminFormActionsClass,
  adminFormGridClass,
  adminFormInputClass,
  adminFormLabelClass,
} from "@/shared/lib/admin-density";
import { EstimateDescriptionAiAssistant } from "./EstimateDescriptionAiAssistant";
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
  aiFeaturesEnabled?: boolean;
  canDraftDescription?: boolean;
};

type WizardStep = "info" | "line-items";

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

export function EstimateForm({
  customers,
  jobs,
  serviceItems,
  initialData,
  onSubmit,
  onCancel,
  error,
  isSubmitting = false,
  aiFeaturesEnabled = false,
  canDraftDescription = true,
}: EstimateFormProps) {
  const defaults = useMemo(
    () => ({
      ...emptyForm,
      ...initialData,
      validUntil: initialData?.validUntil || getDefaultValidUntilDate(),
    }),
    [initialData],
  );
  const [step, setStep] = useState<WizardStep>("info");
  const [customerId, setCustomerId] = useState(defaults.customerId);
  const [jobId, setJobId] = useState(defaults.jobId ?? "");
  const [status, setStatus] = useState<EstimateStatus>(defaults.status);
  const [validUntil, setValidUntil] = useState(defaults.validUntil);
  const [notes, setNotes] = useState(defaults.notes);
  const [taxRate, setTaxRate] = useState(defaults.taxRate);
  const [lineItems, setLineItems] = useState<EstimateLineItemFormData[]>(
    defaults.lineItems,
  );
  const [stepError, setStepError] = useState<string | null>(null);

  const customerJobs = useMemo(
    () => jobs.filter((job) => job.customerId === customerId),
    [jobs, customerId],
  );

  const selectedCustomer = useMemo(
    () => customers.find((customer) => customer.id === customerId),
    [customers, customerId],
  );

  const selectedJob = useMemo(
    () => jobs.find((job) => job.id === jobId),
    [jobs, jobId],
  );

  const statusOptions = ESTIMATE_STATUS_OPTIONS.filter(
    (option) => option.value !== "all",
  );

  function handleCustomerChange(nextCustomerId: string) {
    setCustomerId(nextCustomerId);
    setJobId("");
    setStepError(null);
  }

  function handleNextStep() {
    if (!customerId) {
      setStepError("Select a customer to continue.");
      return;
    }

    setStepError(null);
    setStep("line-items");
  }

  function handleBackStep() {
    setStepError(null);
    setStep("info");
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (isSubmitting || step !== "line-items") {
      return;
    }

    const validLineItems = lineItems.filter(
      (item) =>
        (item.name.trim().length > 0 || item.description.trim().length > 0) &&
        item.quantity > 0,
    );

    if (validLineItems.length === 0) {
      setStepError("Add at least one line item with a name and quantity.");
      return;
    }

    setStepError(null);

    onSubmit({
      customerId,
      jobId: jobId.trim() || undefined,
      status,
      validUntil,
      notes,
      taxRate,
      lineItems: validLineItems,
    });
  }

  const displayError = error ?? stepError;

  return (
    <form
      onSubmit={handleSubmit}
      className="overlay-form-shell px-3 py-3 sm:px-4 sm:py-4"
      aria-busy={isSubmitting}
    >
      <div className="mb-2 shrink-0">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
          Step {step === "info" ? "1" : "2"} of 2
        </p>
        <p className="text-sm font-semibold text-slate-900">
          {step === "info" ? "Estimate info" : "Line items"}
        </p>
      </div>

      {displayError ? (
        <div className="mb-2 shrink-0 rounded-md border border-red-200 bg-red-50 px-2.5 py-1.5 text-sm text-red-700">
          {displayError}
        </div>
      ) : null}

      <div className="overlay-form-scroll overflow-x-hidden">
        <fieldset
          disabled={isSubmitting}
          className="m-0 min-w-0 border-0 p-0"
        >
          {step === "info" ? (
            <div className={`${adminFormGridClass} gap-2.5`}>
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
                  <option value="">Select…</option>
                  {customers.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="jobId" className={adminFormLabelClass}>
                  Job
                </label>
                <select
                  id="jobId"
                  name="jobId"
                  value={jobId}
                  onChange={(e) => setJobId(e.target.value)}
                  disabled={!customerId}
                  className={adminFormInputClass}
                  title="Optional linked job"
                >
                  <option value="">None</option>
                  {customerJobs.map((job) => (
                    <option key={job.id} value={job.id}>
                      {job.jobNumber}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="status" className={adminFormLabelClass}>
                  Status
                </label>
                <select
                  id="status"
                  name="status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as EstimateStatus)}
                  className={adminFormInputClass}
                >
                  {statusOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="validUntil" className={adminFormLabelClass}>
                  Valid until
                </label>
                <input
                  id="validUntil"
                  name="validUntil"
                  type="date"
                  value={validUntil}
                  onChange={(e) => setValidUntil(e.target.value)}
                  className={adminFormInputClass}
                  title="Defaults to 30 days from today"
                />
              </div>

              <div>
                <label htmlFor="taxRate" className={adminFormLabelClass}>
                  Tax %
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
            </div>
          ) : (
            <div className="space-y-2.5">
              <LineItemsEditor
                lineItems={lineItems}
                serviceItems={serviceItems}
                taxRate={taxRate}
                onChange={setLineItems}
              />

              <div className="rounded-lg border border-slate-200 bg-white p-2.5">
                <label htmlFor="notes" className={adminFormLabelClass}>
                  Notes / Description
                </label>
                <textarea
                  id="notes"
                  name="notes"
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Rough notes — rewrite with AI for a customer-facing description"
                  className={`${adminFormInputClass} mt-1`}
                />
                <EstimateDescriptionAiAssistant
                  notes={notes}
                  onNotesChange={setNotes}
                  lineItems={lineItems}
                  customerName={selectedCustomer?.name}
                  jobType={selectedJob?.jobType}
                  jobTitle={selectedJob?.description}
                  jobNumber={selectedJob?.jobNumber}
                  jobId={jobId.trim() || undefined}
                  aiFeaturesEnabled={aiFeaturesEnabled}
                  canDraft={canDraftDescription}
                  disabled={isSubmitting}
                />
              </div>
            </div>
          )}
        </fieldset>
      </div>

      <div className={`${adminFormActionsClass} overlay-form-actions bg-white`}>
        {step === "info" ? (
          <>
            <button
              type="button"
              onClick={handleNextStep}
              disabled={isSubmitting}
              className="min-h-11 flex-1 rounded-lg bg-cyan-600 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-cyan-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Next
            </button>
            <button
              type="button"
              onClick={onCancel}
              disabled={isSubmitting}
              className="min-h-11 flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Cancel
            </button>
          </>
        ) : (
          <>
            <button
              type="submit"
              disabled={isSubmitting}
              className="min-h-11 flex-1 rounded-lg bg-cyan-600 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-cyan-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? "Saving…" : "Save estimate"}
            </button>
            <button
              type="button"
              onClick={handleBackStep}
              disabled={isSubmitting}
              className="min-h-11 flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Back
            </button>
          </>
        )}
      </div>
    </form>
  );
}
