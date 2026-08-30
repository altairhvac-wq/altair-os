"use client";

import { useId, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Button,
  fieldControlClass,
  fieldLabelClass,
} from "@/shared/design-system/components";
import {
  EXPENSE_CATEGORY_OPTIONS,
  type ExpenseCategory,
  type ExpenseFormData,
  type ExpensePaymentMethod,
} from "@/shared/types/expense";
import {
  ExpensePaymentMethodField,
  parseExpensePaymentMethod,
} from "./ExpensePaymentMethodField";
import { ReceiptUploadBox } from "./ReceiptUploadBox";
import { submitExpenseWithReceipt } from "@/shared/lib/submit-expense-with-receipt";
import { formatActionError } from "@/shared/lib/operational-errors";

type ExpenseFormProps = {
  initialData?: Partial<ExpenseFormData>;
  jobId?: string;
  onSuccess?: () => void;
  onCancel: () => void;
};

const inputClass = fieldControlClass;
const labelClass = fieldLabelClass;

export function ExpenseForm({
  initialData,
  jobId,
  onSuccess,
  onCancel,
}: ExpenseFormProps) {
  /* Namespaced because this form can be mounted twice at once: the detail-panel
   * primitive renders its children into both a desktop drawer and a mobile
   * overlay, and both portal into document.body. With static ids the document
   * held two `#amount`, and `<label htmlFor="amount">` resolves to the FIRST —
   * the drawer copy, which is `display: none` below 1024px. So tapping a field
   * label on a phone focused an invisible input and no keyboard opened. */
  const uid = useId();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<ExpensePaymentMethod>(
    initialData?.paymentMethod ?? "personal_card",
  );

  const categoryOptions = EXPENSE_CATEGORY_OPTIONS.filter(
    (option) => option.value !== "all",
  );

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isPending) {
      return;
    }

    setError(null);

    startTransition(async () => {
      const form = new FormData(event.currentTarget);
      const amountValue = String(form.get("amount") ?? "").trim();
      const purchaseDate = String(form.get("purchaseDate") ?? "").trim();
      const merchant = String(form.get("merchant") ?? "").trim();
      const category = String(form.get("category") ?? "materials") as ExpenseCategory;
      const notes = String(form.get("notes") ?? "").trim();
      const linkedJobId =
        jobId ?? (String(form.get("jobId") ?? "").trim() || undefined);

      const data: ExpenseFormData = {
        amount: amountValue ? Number(amountValue) : undefined,
        purchaseDate: purchaseDate || undefined,
        merchant: merchant || undefined,
        category,
        paymentMethod: parseExpensePaymentMethod(form.get("paymentMethod")),
        jobId: linkedJobId,
        notes: notes || undefined,
      };

      const result = await submitExpenseWithReceipt({ data, receiptFile });

      if (result.error) {
        setError(formatActionError(result.error, "Could not save this expense. Try again."));
        return;
      }

      onSuccess?.();
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor={`${uid}-amount`} className={labelClass}>
            Amount{" "}
            <span className="font-normal text-slate-400">(optional)</span>
          </label>
          <input
            id={`${uid}-amount`}
            name="amount"
            type="number"
            min="0"
            step="0.01"
            defaultValue={initialData?.amount ?? ""}
            placeholder="0.00"
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor={`${uid}-purchaseDate`} className={labelClass}>
            Purchase date{" "}
            <span className="font-normal text-slate-400">(optional)</span>
          </label>
          <input
            id={`${uid}-purchaseDate`}
            name="purchaseDate"
            type="date"
            defaultValue={initialData?.purchaseDate ?? ""}
            className={inputClass}
          />
        </div>

        <div className="sm:col-span-2">
          <label htmlFor={`${uid}-merchant`} className={labelClass}>
            Merchant / vendor{" "}
            <span className="font-normal text-slate-400">(optional)</span>
          </label>
          <input
            id={`${uid}-merchant`}
            name="merchant"
            defaultValue={initialData?.merchant ?? ""}
            placeholder="Home Depot"
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor={`${uid}-category`} className={labelClass}>
            Category
          </label>
          <select
            id={`${uid}-category`}
            name="category"
            defaultValue={initialData?.category ?? "materials"}
            className={inputClass}
          >
            {categoryOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {!jobId ? (
          <div>
            <label htmlFor={`${uid}-jobId`} className={labelClass}>
              Linked job ID{" "}
              <span className="font-normal text-slate-400">(optional)</span>
            </label>
            <input
              id={`${uid}-jobId`}
              name="jobId"
              defaultValue={initialData?.jobId ?? ""}
              placeholder="Job UUID"
              className={inputClass}
            />
          </div>
        ) : (
          <input type="hidden" name="jobId" value={jobId} />
        )}

        <div className="sm:col-span-2">
          <ExpensePaymentMethodField
            value={paymentMethod}
            onChange={setPaymentMethod}
            disabled={isPending}
          />
        </div>

        <div className="sm:col-span-2">
          <label htmlFor={`${uid}-notes`} className={labelClass}>
            Notes
          </label>
          <textarea
            id={`${uid}-notes`}
            name="notes"
            rows={3}
            defaultValue={initialData?.notes ?? ""}
            placeholder="What was purchased and why"
            className={inputClass}
          />
        </div>
      </div>

      <section>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Receipt
        </h3>
        <ReceiptUploadBox
          compact
          selectedFile={receiptFile}
          onFileSelected={setReceiptFile}
        />
      </section>

      {error ? (
        <p className="break-words text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}

      <div className="flex gap-2 border-t border-slate-100 pt-4">
        <Button
          type="submit"
          loading={isPending}
          className="flex-1"
        >
          {isPending ? "Saving…" : "Save draft expense"}
        </Button>
        <Button
          type="button"
          onClick={onCancel}
          disabled={isPending}
          variant="secondary"
          className="flex-1"
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
