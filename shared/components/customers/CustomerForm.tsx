"use client";

import {
  CUSTOMER_STATUS_OPTIONS,
  type CustomerFormData,
  type CustomerStatus,
} from "@/shared/types/customer";
import { adminFormActionsClass } from "@/shared/lib/admin-density";
import {
  Field,
  Input,
  Select,
  Textarea,
  fieldGroupClass,
  fieldGridClass,
} from "@/shared/design-system/components";

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
    <form onSubmit={handleSubmit} className={fieldGroupClass}>
      <div className={fieldGridClass}>
        <Field label="Full name" required className="sm:col-span-2">
          <Input
            name="name"
            defaultValue={defaults.name}
            placeholder="Jane Smith"
          />
        </Field>

        <Field label="Email" required={requireContact}>
          <Input
            name="email"
            type="email"
            defaultValue={defaults.email}
            placeholder="jane@example.com"
          />
        </Field>

        <Field label="Phone" required={requireContact}>
          <Input
            name="phone"
            type="tel"
            defaultValue={defaults.phone}
            placeholder="(555) 555-0100"
          />
        </Field>

        <Field label="Company">
          <Input
            name="company"
            defaultValue={defaults.company}
            placeholder="Optional"
          />
        </Field>

        <Field label="Status">
          <Select name="status" defaultValue={defaults.status}>
            {CUSTOMER_STATUS_OPTIONS.filter((o) => o.value !== "all").map(
              (option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ),
            )}
          </Select>
        </Field>
      </div>

      <div className={fieldGroupClass}>
        <p className="text-xs font-semibold uppercase tracking-wide text-altair-ink-on-paper-secondary">
          Service location
        </p>
        <div className={fieldGroupClass}>
          <Field label="Street address" required>
            <Input
              name="address"
              defaultValue={defaults.address}
              placeholder="123 Main St"
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="City" required>
              <Input name="city" defaultValue={defaults.city} />
            </Field>
            <Field label="State" required>
              <Input name="state" defaultValue={defaults.state} />
            </Field>
            <Field label="ZIP" required>
              <Input name="zip" defaultValue={defaults.zip} />
            </Field>
          </div>
        </div>
      </div>

      <Field label="Notes">
        <Textarea
          name="notes"
          rows={3}
          defaultValue={defaults.notes}
          placeholder="Scheduling preferences, access codes, etc."
          className="resize-none"
        />
      </Field>

      {error ? (
        <p
          role="alert"
          className="rounded-xl border border-altair-danger/30 bg-altair-danger-surface px-3 py-2 text-sm text-altair-danger-foreground"
        >
          {error}
        </p>
      ) : null}

      <div className={`${adminFormActionsClass} border-t border-altair-border pt-4`}>
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
          className="min-h-11 rounded-xl border border-altair-border px-4 py-2.5 text-sm font-semibold text-altair-ink-on-paper transition-colors hover:bg-altair-paper-subtle disabled:cursor-not-allowed disabled:opacity-60"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
