"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useRouter } from "next/navigation";
import { getDefaultPaymentDate } from "@/shared/types/invoice-payment";
import {
  EXPENSE_CATEGORY_OPTIONS,
  type ExpenseCategory,
  type ExpenseFormData,
  type ExpensePaymentMethod,
} from "@/shared/types/expense";
import {
  ExpensePaymentMethodField,
  parseExpensePaymentMethod,
} from "@/shared/components/expenses/ExpensePaymentMethodField";
import { ReceiptUploadBox } from "@/shared/components/expenses/ReceiptUploadBox";
import { submitExpenseWithReceipt } from "@/shared/lib/submit-expense-with-receipt";

type TechnicianExpenseFormProps = {
  jobId?: string;
  jobNumber?: string;
  onSuccess?: () => void;
  onCancel: () => void;
  onSubmittingChange?: (isSubmitting: boolean) => void;
};

const FIELD_CATEGORY_OPTIONS: ExpenseCategory[] = [
  "materials",
  "fuel",
  "tools",
  "meals",
  "vehicle",
  "other",
];

const inputClass =
  "w-full min-h-11 rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-base text-slate-900 placeholder:text-slate-400 outline-none transition-colors focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 sm:text-sm";

const numericInputClass = `${inputClass} tabular-nums`;

const labelClass = "mb-1.5 block text-xs font-semibold text-slate-600";

export function TechnicianExpenseForm({
  jobId,
  jobNumber,
  onSuccess,
  onCancel,
  onSubmittingChange,
}: TechnicianExpenseFormProps) {
  const router = useRouter();
  const submitLockRef = useRef(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [category, setCategory] = useState<ExpenseCategory>("materials");
  const [showMore, setShowMore] = useState(false);
  const [paymentMethod, setPaymentMethod] =
    useState<ExpensePaymentMethod>("personal_card");

  const categoryOptions = EXPENSE_CATEGORY_OPTIONS.filter(
    (option) => option.value !== "all",
  );

  useEffect(() => {
    onSubmittingChange?.(isPending);
  }, [isPending, onSubmittingChange]);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitLockRef.current || isPending) {
      return;
    }

    setError(null);
    const formEl = event.currentTarget;

    submitLockRef.current = true;

    startTransition(async () => {
      const form = new FormData(formEl);
      const amountValue = String(form.get("amount") ?? "").trim();
      const merchant = String(form.get("merchant") ?? "").trim();

      if (!receiptFile && !amountValue) {
        setError("Add a receipt photo or enter an amount.");
        submitLockRef.current = false;
        return;
      }

      if (amountValue) {
        const parsedAmount = Number(amountValue);
        if (!Number.isFinite(parsedAmount) || parsedAmount < 0) {
          setError("Enter a valid amount of zero or greater.");
          submitLockRef.current = false;
          return;
        }
      }

      const data: ExpenseFormData = {
        amount: amountValue ? Number(amountValue) : undefined,
        purchaseDate: getDefaultPaymentDate(),
        merchant: merchant || undefined,
        category,
        paymentMethod: parseExpensePaymentMethod(form.get("paymentMethod")),
        jobId,
      };

      const result = await submitExpenseWithReceipt({ data, receiptFile });

      if (result.error) {
        setError(result.error);
        submitLockRef.current = false;
        return;
      }

      onSuccess?.();
      router.refresh();
    });
  }

  return (
    <form
      id="technician-expense-form"
      onSubmit={handleSubmit}
      className="space-y-4"
      aria-busy={isPending}
    >
      {jobNumber ? (
        <div className="rounded-xl bg-slate-50 px-3.5 py-2.5 text-sm text-slate-600">
          Linked to{" "}
          <span className="font-semibold text-slate-900">{jobNumber}</span>
        </div>
      ) : null}

      <ReceiptUploadBox
        compact
        captureEnvironment
        selectedFile={receiptFile}
        onFileSelected={setReceiptFile}
      />

      <div>
        <label htmlFor="tech-expense-amount" className={labelClass}>
          Amount
        </label>
        <input
          id="tech-expense-amount"
          name="amount"
          type="number"
          inputMode="decimal"
          min="0"
          step="0.01"
          placeholder="0.00"
          disabled={isPending}
          enterKeyHint="done"
          className={numericInputClass}
        />
      </div>

      <fieldset>
        <legend className={labelClass}>Category</legend>
        <input type="hidden" name="category" value={category} />
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          {FIELD_CATEGORY_OPTIONS.map((value) => {
            const label =
              categoryOptions.find((option) => option.value === value)?.label ??
              value;

            return (
              <button
                key={value}
                type="button"
                disabled={isPending}
                onClick={() => setCategory(value)}
                className={`inline-flex min-h-11 shrink-0 items-center rounded-xl border px-3.5 py-2 text-sm font-semibold transition-colors ${
                  category === value
                    ? "border-cyan-300 bg-cyan-50 text-cyan-900"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </fieldset>

      <ExpensePaymentMethodField
        variant="toggle"
        value={paymentMethod}
        onChange={setPaymentMethod}
        disabled={isPending}
      />

      <button
        type="button"
        onClick={() => setShowMore((current) => !current)}
        disabled={isPending}
        className="flex min-h-11 w-full items-center justify-between rounded-xl border border-slate-200 bg-slate-50/80 px-3.5 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100 disabled:opacity-60"
        aria-expanded={showMore}
      >
        <span>More options</span>
        {showMore ? (
          <ChevronUp className="h-4 w-4 text-slate-400" />
        ) : (
          <ChevronDown className="h-4 w-4 text-slate-400" />
        )}
      </button>

      {showMore ? (
        <div className="space-y-4 rounded-xl border border-slate-100 bg-slate-50/50 p-3.5">
          <div>
            <label htmlFor="tech-expense-merchant" className={labelClass}>
              Vendor{" "}
              <span className="font-normal text-slate-400">(optional)</span>
            </label>
            <input
              id="tech-expense-merchant"
              name="merchant"
              placeholder="Home Depot"
              disabled={isPending}
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="tech-expense-category-select" className={labelClass}>
              All categories
            </label>
            <select
              id="tech-expense-category-select"
              value={category}
              onChange={(event) =>
                setCategory(event.target.value as ExpenseCategory)
              }
              disabled={isPending}
              className={inputClass}
            >
              {categoryOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      ) : null}

      {error ? (
        <p className="text-sm text-red-600" role="alert" aria-live="polite">
          {error}
        </p>
      ) : null}
    </form>
  );
}
