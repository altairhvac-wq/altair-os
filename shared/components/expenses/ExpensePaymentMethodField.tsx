"use client";

import {
  EXPENSE_PAYMENT_METHOD_OPTIONS,
  deriveIsReimbursable,
  type ExpensePaymentMethod,
} from "@/shared/types/expense";

type ExpensePaymentMethodFieldProps = {
  variant?: "select" | "toggle";
  value: ExpensePaymentMethod;
  onChange: (method: ExpensePaymentMethod) => void;
  disabled?: boolean;
  name?: string;
};

const labelClass = "mb-1.5 block text-xs font-semibold text-slate-600";

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
            className={`rounded-xl border px-3 py-3 text-left transition-colors ${
              value !== "company_card"
                ? "border-cyan-300 bg-cyan-50 text-cyan-900"
                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            <span className="block text-sm font-semibold">My card / cash</span>
            <span className="mt-0.5 block text-xs text-slate-500">
              Reimbursable
            </span>
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={() => onChange("company_card")}
            className={`rounded-xl border px-3 py-3 text-left transition-colors ${
              value === "company_card"
                ? "border-cyan-300 bg-cyan-50 text-cyan-900"
                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            <span className="block text-sm font-semibold">Company card</span>
            <span className="mt-0.5 block text-xs text-slate-500">
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
        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition-colors focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20"
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
