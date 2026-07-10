"use client";

import { useRef, type ChangeEvent, type FormEvent, type RefObject } from "react";
import {
  JOB_PRIORITY_OPTIONS,
  JOB_STATUS_OPTIONS,
  JOB_TYPE_OPTIONS,
  type Job,
  type JobFormData,
  type JobPriority,
  type JobStatus,
} from "@/shared/types/job";
import type { Customer } from "@/shared/types/customer";
import {
  adminDetailsBodyClass,
  adminDetailsClass,
  adminDetailsSummaryClass,
  adminFormActionsClass,
  adminFormGridClass,
  adminFormInputClass,
  adminFormLabelClass,
  adminFormStackClass,
} from "@/shared/lib/admin-density";

type AddressField = "serviceAddress" | "city" | "state" | "zip";

type JobFormProps = {
  customers: Customer[];
  initialData?: Partial<JobFormData>;
  onSubmit: (data: JobFormData) => void;
  onCancel: () => void;
  error?: string | null;
  isSubmitting?: boolean;
  lockStatus?: boolean;
};

const emptyForm: JobFormData = {
  customerId: "",
  serviceAddress: "",
  city: "",
  state: "",
  zip: "",
  jobType: JOB_TYPE_OPTIONS[0],
  scheduledDate: "",
  status: "scheduled",
  priority: "normal",
  description: "",
  notes: "",
};

function toDatetimeLocal(iso: string): string {
  const date = new Date(iso);
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60 * 1000);
  return local.toISOString().slice(0, 16);
}

export function jobToFormData(job: Job): Partial<JobFormData> {
  return {
    customerId: job.customerId,
    serviceAddress: job.serviceAddress,
    city: job.city,
    state: job.state,
    zip: job.zip,
    jobType: job.jobType,
    scheduledDate: toDatetimeLocal(job.scheduledDate),
    status: job.status,
    priority: job.priority,
    description: job.description ?? "",
    notes: job.notes ?? "",
  };
}

export function JobForm({
  customers,
  initialData,
  onSubmit,
  onCancel,
  error,
  isSubmitting = false,
  lockStatus = false,
}: JobFormProps) {
  const defaults = { ...emptyForm, ...initialData };
  const manuallyEdited = useRef(new Set<AddressField>());
  const serviceAddressRef = useRef<HTMLInputElement>(null);
  const cityRef = useRef<HTMLInputElement>(null);
  const stateRef = useRef<HTMLInputElement>(null);
  const zipRef = useRef<HTMLInputElement>(null);

  function markAddressEdited(field: AddressField) {
    manuallyEdited.current.add(field);
  }

  function handleCustomerChange(e: ChangeEvent<HTMLSelectElement>) {
    const customer = customers.find((c) => c.id === e.target.value);
    if (!customer) return;

    const addressFields: {
      field: AddressField;
      ref: RefObject<HTMLInputElement | null>;
      value: string;
    }[] = [
      { field: "serviceAddress", ref: serviceAddressRef, value: customer.address },
      { field: "city", ref: cityRef, value: customer.city },
      { field: "state", ref: stateRef, value: customer.state },
      { field: "zip", ref: zipRef, value: customer.zip },
    ];

    for (const { field, ref, value } of addressFields) {
      const input = ref.current;
      if (!input || manuallyEdited.current.has(field) || input.value.trim() !== "") {
        continue;
      }
      if (value) {
        input.value = value;
      }
    }
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);

    onSubmit({
      customerId: String(form.get("customerId") ?? ""),
      serviceAddress: String(form.get("serviceAddress") ?? ""),
      city: String(form.get("city") ?? ""),
      state: String(form.get("state") ?? ""),
      zip: String(form.get("zip") ?? ""),
      jobType: String(form.get("jobType") ?? JOB_TYPE_OPTIONS[0]),
      scheduledDate: String(form.get("scheduledDate") ?? ""),
      status: String(form.get("status") ?? "scheduled") as JobStatus,
      priority: String(form.get("priority") ?? "normal") as JobPriority,
      description: String(form.get("description") ?? ""),
      notes: String(form.get("notes") ?? ""),
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="overlay-form-shell min-h-0 flex-1 px-3 py-3 sm:px-4 sm:py-4"
    >
      <div className="overlay-form-scroll min-h-0 space-y-2.5 pb-2">
      <div className={adminFormGridClass}>
        <div className="sm:col-span-2">
          <label htmlFor="customerId" className={adminFormLabelClass}>
            Customer
          </label>
          <select
            id="customerId"
            name="customerId"
            required
            defaultValue={defaults.customerId}
            onChange={handleCustomerChange}
            className={adminFormInputClass}
          >
            <option value="" disabled>
              Select…
            </option>
            {customers.map((customer) => (
              <option key={customer.id} value={customer.id}>
                {customer.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="jobType" className={adminFormLabelClass}>
            Type
          </label>
          <select
            id="jobType"
            name="jobType"
            defaultValue={defaults.jobType}
            className={adminFormInputClass}
          >
            {JOB_TYPE_OPTIONS.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="scheduledDate" className={adminFormLabelClass}>
            Scheduled
          </label>
          <input
            id="scheduledDate"
            name="scheduledDate"
            type="datetime-local"
            required
            defaultValue={defaults.scheduledDate}
            className={adminFormInputClass}
          />
        </div>

        <div>
          <label htmlFor="status" className={adminFormLabelClass}>
            Status
          </label>
          {lockStatus ? (
            <>
              <input type="hidden" name="status" value={defaults.status} />
              <p
                className="flex min-h-11 items-center rounded-md border border-slate-200 bg-white px-2.5 text-sm text-slate-700"
                title="Use workflow actions to change status"
              >
                {JOB_STATUS_OPTIONS.find((option) => option.value === defaults.status)
                  ?.label ?? defaults.status}
              </p>
            </>
          ) : (
            <select
              id="status"
              name="status"
              defaultValue={defaults.status}
              className={adminFormInputClass}
            >
              {JOB_STATUS_OPTIONS.filter((o) => o.value !== "all").map(
                (option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ),
              )}
            </select>
          )}
        </div>

        <div>
          <label htmlFor="priority" className={adminFormLabelClass}>
            Priority
          </label>
          <select
            id="priority"
            name="priority"
            defaultValue={defaults.priority}
            className={adminFormInputClass}
          >
            {JOB_PRIORITY_OPTIONS.filter((o) => o.value !== "all").map(
              (option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ),
            )}
          </select>
        </div>
      </div>

      <div className="grid gap-2">
        <div>
          <label htmlFor="serviceAddress" className={adminFormLabelClass}>
            Address
          </label>
          <input
            id="serviceAddress"
            name="serviceAddress"
            ref={serviceAddressRef}
            required
            defaultValue={defaults.serviceAddress}
            placeholder="Street"
            onInput={() => markAddressEdited("serviceAddress")}
            className={adminFormInputClass}
          />
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div>
            <label htmlFor="city" className={adminFormLabelClass}>
              City
            </label>
            <input
              id="city"
              name="city"
              ref={cityRef}
              required
              defaultValue={defaults.city}
              onInput={() => markAddressEdited("city")}
              className={adminFormInputClass}
            />
          </div>
          <div>
            <label htmlFor="state" className={adminFormLabelClass}>
              ST
            </label>
            <input
              id="state"
              name="state"
              ref={stateRef}
              required
              defaultValue={defaults.state}
              onInput={() => markAddressEdited("state")}
              className={adminFormInputClass}
            />
          </div>
          <div>
            <label htmlFor="zip" className={adminFormLabelClass}>
              ZIP
            </label>
            <input
              id="zip"
              name="zip"
              ref={zipRef}
              required
              defaultValue={defaults.zip}
              onInput={() => markAddressEdited("zip")}
              className={adminFormInputClass}
            />
          </div>
        </div>
      </div>

      <details className={adminDetailsClass}>
        <summary className={adminDetailsSummaryClass}>
          <span>Description & notes</span>
        </summary>
        <div className={`${adminDetailsBodyClass} space-y-2`}>
          <div>
            <label htmlFor="description" className={adminFormLabelClass}>
              Description
            </label>
            <textarea
              id="description"
              name="description"
              rows={2}
              defaultValue={defaults.description}
              placeholder="Work to perform"
              className={`${adminFormInputClass} resize-none`}
            />
          </div>
          <div>
            <label htmlFor="notes" className={adminFormLabelClass}>
              Notes
            </label>
            <textarea
              id="notes"
              name="notes"
              rows={2}
              defaultValue={defaults.notes}
              placeholder="Access, preferences…"
              className={`${adminFormInputClass} resize-none`}
            />
          </div>
        </div>
      </details>

      {error ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-2.5 py-1.5 text-sm text-red-700">
          {error}
        </p>
      ) : null}
      </div>

      <div className={`${adminFormActionsClass} overlay-form-actions admin-sticky-footer-inline bg-white`}>
        <button
          type="submit"
          disabled={isSubmitting || customers.length === 0}
          className="min-h-11 flex-1 admin-btn-primary disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? "Saving…" : "Save job"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className="min-h-11 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
