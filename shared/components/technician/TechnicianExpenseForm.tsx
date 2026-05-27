"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  createExpenseAction,
  prepareExpenseReceiptUploadAction,
} from "@/app/actions/expenses";
import { COMPANY_FILES_BUCKET } from "@/lib/storage/company-files";
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

type TechnicianExpenseFormProps = {
  jobId?: string;
  jobNumber?: string;
  onSuccess?: () => void;
  onCancel: () => void;
};

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-colors focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20";

const labelClass = "mb-1.5 block text-xs font-semibold text-slate-600";

export function TechnicianExpenseForm({
  jobId,
  jobNumber,
  onSuccess,
  onCancel,
}: TechnicianExpenseFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [paymentMethod, setPaymentMethod] =
    useState<ExpensePaymentMethod>("personal_card");

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
      const merchant = String(form.get("merchant") ?? "").trim();
      const category = String(form.get("category") ?? "materials") as ExpenseCategory;

      const data: ExpenseFormData = {
        amount: amountValue ? Number(amountValue) : undefined,
        purchaseDate: new Date().toISOString().slice(0, 10),
        merchant: merchant || undefined,
        category,
        paymentMethod: parseExpensePaymentMethod(form.get("paymentMethod")),
        jobId,
      };

      const expenseId = crypto.randomUUID();
      let receiptFileName: string | undefined;
      let receiptStoragePath: string | undefined;
      let receiptMimeType: string | undefined;
      let receiptFileSize: number | undefined;

      if (receiptFile) {
        const target = await prepareExpenseReceiptUploadAction({
          expenseId,
          fileName: receiptFile.name,
        });

        if (target.error || !target.storagePath) {
          setError(target.error ?? "Could not prepare receipt upload.");
          return;
        }

        const supabase = createClient();
        const { error: uploadError } = await supabase.storage
          .from(COMPANY_FILES_BUCKET)
          .upload(target.storagePath, receiptFile, {
            upsert: false,
            contentType: receiptFile.type,
          });

        if (uploadError) {
          setError(uploadError.message || "Receipt upload failed.");
          return;
        }

        receiptFileName = receiptFile.name;
        receiptStoragePath = target.storagePath;
        receiptMimeType = receiptFile.type;
        receiptFileSize = receiptFile.size;
      }

      const result = await createExpenseAction({
        data,
        expenseId,
        receiptFileName,
        receiptStoragePath,
        receiptMimeType,
        receiptFileSize,
      });

      if (result.error) {
        if (receiptStoragePath) {
          const supabase = createClient();
          await supabase.storage
            .from(COMPANY_FILES_BUCKET)
            .remove([receiptStoragePath]);
        }
        setError(result.error);
        return;
      }

      onSuccess?.();
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {jobNumber ? (
        <div className="rounded-xl bg-slate-50 px-3.5 py-2.5 text-sm text-slate-600">
          Linked to{" "}
          <span className="font-semibold text-slate-900">{jobNumber}</span>
        </div>
      ) : null}

      <section>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Receipt photo
        </h3>
        <ReceiptUploadBox
          compact
          captureEnvironment
          selectedFile={receiptFile}
          onFileSelected={setReceiptFile}
        />
      </section>

      <div>
        <label htmlFor="tech-expense-amount" className={labelClass}>
          Amount{" "}
          <span className="font-normal text-slate-400">(optional)</span>
        </label>
        <input
          id="tech-expense-amount"
          name="amount"
          type="number"
          inputMode="decimal"
          min="0"
          step="0.01"
          placeholder="0.00"
          className={inputClass}
        />
      </div>

      <div>
        <label htmlFor="tech-expense-category" className={labelClass}>
          Category
        </label>
        <select
          id="tech-expense-category"
          name="category"
          defaultValue="materials"
          className={inputClass}
        >
          {categoryOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="tech-expense-merchant" className={labelClass}>
          Vendor{" "}
          <span className="font-normal text-slate-400">(optional)</span>
        </label>
        <input
          id="tech-expense-merchant"
          name="merchant"
          placeholder="Home Depot"
          className={inputClass}
        />
      </div>

      <ExpensePaymentMethodField
        variant="toggle"
        value={paymentMethod}
        onChange={setPaymentMethod}
        disabled={isPending}
      />

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <div className="flex gap-3 border-t border-slate-100 pt-4">
        <button
          type="button"
          onClick={onCancel}
          disabled={isPending}
          className="inline-flex flex-1 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-60"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex flex-1 items-center justify-center rounded-xl bg-cyan-600 px-4 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-cyan-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? "Saving..." : "Save receipt"}
        </button>
      </div>
    </form>
  );
}
