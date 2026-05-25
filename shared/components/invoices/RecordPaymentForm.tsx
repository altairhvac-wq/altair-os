"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { recordInvoicePaymentAction } from "@/app/actions/invoice-payments";
import { formatCurrency } from "@/shared/types/customer";
import type { InvoiceDetail } from "@/shared/types/invoice";
import {
  getDefaultPaymentDate,
  isInvoicePayable,
  PAYMENT_METHOD_OPTIONS,
  type PaymentMethod,
  type RecordPaymentFormData,
} from "@/shared/types/invoice-payment";

type RecordPaymentFormProps = {
  invoice: InvoiceDetail;
};

const inputClass =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-colors focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20";

const labelClass = "mb-1.5 block text-xs font-semibold text-slate-600";

export function RecordPaymentForm({ invoice }: RecordPaymentFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [amount, setAmount] = useState(String(invoice.balanceDue));
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [paymentDate, setPaymentDate] = useState(getDefaultPaymentDate());
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");

  if (!isInvoicePayable(invoice.status) || invoice.balanceDue <= 0) {
    return null;
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const parsedAmount = Number.parseFloat(amount);

    const data: RecordPaymentFormData = {
      amount: parsedAmount,
      paymentMethod,
      paymentDate,
      reference,
      notes,
    };

    startTransition(async () => {
      const result = await recordInvoicePaymentAction(invoice.id, data);

      if (result.error) {
        setError(result.error);
        return;
      }

      if (result.invoice) {
        setAmount(String(result.invoice.balanceDue));
      }
      setReference("");
      setNotes("");
      router.refresh();
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border border-slate-200 bg-slate-50/50 p-4"
    >
      <h3 className="text-sm font-semibold text-slate-900">Record payment</h3>
      <p className="mt-1 text-xs text-slate-500">
        Balance due: {formatCurrency(invoice.balanceDue)}
      </p>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="payment-amount" className={labelClass}>
            Amount
          </label>
          <input
            id="payment-amount"
            type="number"
            min="0.01"
            step="0.01"
            max={invoice.balanceDue}
            required
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            className={inputClass}
            disabled={isPending}
          />
        </div>

        <div>
          <label htmlFor="payment-method" className={labelClass}>
            Payment method
          </label>
          <select
            id="payment-method"
            value={paymentMethod}
            onChange={(event) =>
              setPaymentMethod(event.target.value as PaymentMethod)
            }
            className={inputClass}
            disabled={isPending}
          >
            {PAYMENT_METHOD_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="payment-date" className={labelClass}>
            Payment date
          </label>
          <input
            id="payment-date"
            type="date"
            required
            value={paymentDate}
            onChange={(event) => setPaymentDate(event.target.value)}
            className={inputClass}
            disabled={isPending}
          />
        </div>

        <div>
          <label htmlFor="payment-reference" className={labelClass}>
            Reference
          </label>
          <input
            id="payment-reference"
            type="text"
            value={reference}
            onChange={(event) => setReference(event.target.value)}
            placeholder="Check #, transaction ID, etc."
            className={inputClass}
            disabled={isPending}
          />
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="payment-notes" className={labelClass}>
            Notes
          </label>
          <textarea
            id="payment-notes"
            rows={2}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Optional payment notes"
            className={inputClass}
            disabled={isPending}
          />
        </div>
      </div>

      {error ? (
        <p className="mt-3 text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}

      <div className="mt-4">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? "Recording…" : "Record payment"}
        </button>
      </div>
    </form>
  );
}
