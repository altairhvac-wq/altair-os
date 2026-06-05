"use client";

import {
  CUSTOMER_STATUS_OPTIONS,
  type CustomerFormData,
  type CustomerStatus,
} from "@/shared/types/customer";
import { adminFormActionsClass } from "@/shared/lib/admin-density";

type CustomerFormProps = {
  initialData?: Partial<CustomerFormData>;
  variant?: "create" | "edit";
  onSubmit: (data: CustomerFormData) => void;
  onCancel: () => void;
  error?: string | null;
  isSubmitting?: boolean;
};

const emptyForm: CustomerFormData = {
  name: "",
  email: "",
  phone: "",
  company: "",
  status: "active",
  address: "",
  city: "",
  state: "",
  zip: "",
  notes: "",
};

const inputClass =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-colors focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20";

const labelClass = "mb-1.5 block text-xs font-semibold text-slate-600";

export function CustomerForm({
  initialData,
  variant = "create",
  onSubmit,
  onCancel,
  error,
  isSubmitting = false,
}: CustomerFormProps) {
  const defaults = { ...emptyForm, ...initialData };
  const isEdit = variant === "edit";
  const requireContact = !isEdit;

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);

    onSubmit({
      name: String(form.get("name") ?? ""),
      email: String(form.get("email") ?? ""),
      phone: String(form.get("phone") ?? ""),
      company: String(form.get("company") ?? ""),
      status: String(form.get("status") ?? "active") as CustomerStatus,
      address: String(form.get("address") ?? ""),
      city: String(form.get("city") ?? ""),
      state: String(form.get("state") ?? ""),
      zip: String(form.get("zip") ?? ""),
      notes: String(form.get("notes") ?? ""),
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="overlay-form-shell min-h-0 flex-1"
    >
      <div className="overlay-form-scroll space-y-5 pb-1">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label htmlFor="name" className={labelClass}>
            Full name
          </label>
          <input
            id="name"
            name="name"
            required
            defaultValue={defaults.name}
            placeholder="Jane Smith"
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="email" className={labelClass}>
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required={requireContact}
            defaultValue={defaults.email}
            placeholder="jane@example.com"
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="phone" className={labelClass}>
            Phone
          </label>
          <input
            id="phone"
            name="phone"
            type="tel"
            required={requireContact}
            defaultValue={defaults.phone}
            placeholder="(555) 555-0100"
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="company" className={labelClass}>
            Company
          </label>
          <input
            id="company"
            name="company"
            defaultValue={defaults.company}
            placeholder="Optional"
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
            {CUSTOMER_STATUS_OPTIONS.filter((o) => o.value !== "all").map(
              (option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ),
            )}
          </select>
        </div>
      </div>

      <div>
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Service location
        </p>
        <div className="grid gap-4">
          <div>
            <label htmlFor="address" className={labelClass}>
              Street address
            </label>
            <input
              id="address"
              name="address"
              required
              defaultValue={defaults.address}
              placeholder="123 Main St"
              className={inputClass}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label htmlFor="city" className={labelClass}>
                City
              </label>
              <input
                id="city"
                name="city"
                required
                defaultValue={defaults.city}
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="state" className={labelClass}>
                State
              </label>
              <input
                id="state"
                name="state"
                required
                defaultValue={defaults.state}
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="zip" className={labelClass}>
                ZIP
              </label>
              <input
                id="zip"
                name="zip"
                required
                defaultValue={defaults.zip}
                className={inputClass}
              />
            </div>
          </div>
        </div>
      </div>

      <div>
        <label htmlFor="notes" className={labelClass}>
          Notes
        </label>
        <textarea
          id="notes"
          name="notes"
          rows={3}
          defaultValue={defaults.notes}
          placeholder="Scheduling preferences, access codes, etc."
          className={`${inputClass} resize-none`}
        />
      </div>

      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}
      </div>

      <div
        className={`${adminFormActionsClass} overlay-form-actions admin-sticky-footer-inline bg-white`}
      >
        <button
          type="submit"
          disabled={isSubmitting}
          className="min-h-11 flex-1 admin-btn-primary disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting
            ? "Saving..."
            : isEdit
              ? "Save changes"
              : "Save customer"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className="min-h-11 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
