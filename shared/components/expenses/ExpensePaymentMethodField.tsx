"use client";

import {
  EXPENSE_PAYMENT_METHOD_OPTIONS,
  deriveIsReimbursable,
  type ExpensePaymentMethod,
} from "@/shared/types/expense";
import {
  fieldLabelClass,
  fieldSelectClass,
} from "@/shared/design-system/components/field-styles";

type ExpensePaymentMethodFieldProps = {
  variant?: "select" | "toggle";
  value: ExpensePaymentMethod;
  onChange: (method: ExpensePaymentMethod) => void;
  disabled?: boolean;
  name?: string;
};

const labelClass = fieldLabelClass;

export function ExpensePaymentMethodField({
  variant = "select",
  value,
  onChange,
  disabled = false,
  name = "paymentMethod",
}: ExpensePaymentMethodFieldProps) {
  if (variant === "toggle") {
    return (
      <div>
        <p className={labelClass}>Payment</p>
        <input type="hidden" name={name} value={value} />
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            disabled={disabled}
            onClick={() => onChange("personal_card")}
            className={`min-h-11 rounded-xl border px-3 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-altair-ink-on-paper focus-visible:ring-offset-2 ${
              value !== "company_card"
                ? "border-altair-border-strong bg-altair-paper-subtle text-altair-ink-on-paper"
                : "border-altair-border bg-altair-paper-elevated text-altair-ink-on-paper-secondary hover:bg-altair-paper-subtle"
            }`}
          >
            <span className="block text-sm font-semibold">My card / cash</span>
            <span className="mt-0.5 block text-xs text-altair-ink-on-paper-muted">
              Reimbursable
            </span>
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={() => onChange("company_card")}
            className={`min-h-11 rounded-xl border px-3 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-altair-ink-on-paper focus-visible:ring-offset-2 ${
              value === "company_card"
                ? "border-altair-border-strong bg-altair-paper-subtle text-altair-ink-on-paper"
                : "border-altair-border bg-altair-paper-elevated text-altair-ink-on-paper-secondary hover:bg-altair-paper-subtle"
            }`}
          >
            <span className="block text-sm font-semibold">Company card</span>
            <span className="mt-0.5 block text-xs text-altair-ink-on-paper-muted">
              Not reimbursable
            </span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <label htmlFor="expense-payment-method" className={labelClass}>
        Payment method
      </label>
      <select
        id="expense-payment-method"
        name={name}
        value={value}
        disabled={disabled}
        onChange={(event) =>
          onChange(event.target.value as ExpensePaymentMethod)
        }
        className={fieldSelectClass}
      >
        {EXPENSE_PAYMENT_METHOD_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <p className="mt-1.5 text-xs text-slate-500">
        {deriveIsReimbursable(value)
          ? "Marked as reimbursable to the technician."
          : "Company-paid — not reimbursable."}
      </p>
    </div>
  );
}

export function parseExpensePaymentMethod(
  value: FormDataEntryValue | null,
): ExpensePaymentMethod {
  const method = String(value ?? "personal_card") as ExpensePaymentMethod;

  if (
    method === "company_card" ||
    method === "personal_card" ||
    method === "cash" ||
    method === "other"
  ) {
    return method;
  }

  return "personal_card";
}
