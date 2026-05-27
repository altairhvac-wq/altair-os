"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CreditCard, X } from "lucide-react";
import { recordInvoicePaymentAction } from "@/app/actions/invoice-payments";
import { formatCurrency } from "@/shared/types/customer";
import type { InvoiceDetail } from "@/shared/types/invoice";
import {
  canRecordInvoicePayment,
  getDefaultPaymentDate,
  getRecordPaymentBlockReason,
  PAYMENT_METHOD_OPTIONS,
  type PaymentMethod,
  type RecordPaymentFormData,
} from "@/shared/types/invoice-payment";

type RecordPaymentFormProps = {
  invoice: InvoiceDetail;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  showTrigger?: boolean;
};

const inputClass =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-colors focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20";

const labelClass = "mb-1.5 block text-xs font-semibold text-slate-600";

export function RecordPaymentForm({
  invoice,
  open,
  onOpenChange,
  showTrigger = true,
}: RecordPaymentFormProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = open !== undefined;
  const isOpen = isControlled ? open : internalOpen;
  const canRecord = canRecordInvoicePayment(invoice);
  const blockReason = getRecordPaymentBlockReason(invoice);

  function setOpen(nextOpen: boolean) {
    if (isControlled) {
      onOpenChange?.(nextOpen);
      return;
    }

    setInternalOpen(nextOpen);
  }

  return (
    <>
      {showTrigger ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          disabled={!canRecord}
          title={blockReason ?? undefined}
          className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
        >
          <CreditCard className="h-4 w-4" />
          Record payment
        </button>
      ) : null}

      {isOpen && canRecord ? (
        <RecordPaymentModal
          invoice={invoice}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </>
  );
}

type RecordPaymentModalProps = {
  invoice: InvoiceDetail;
  onClose: () => void;
};

function RecordPaymentModal({ invoice, onClose }: RecordPaymentModalProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [amount, setAmount] = useState(String(invoice.balanceDue));
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [paymentDate, setPaymentDate] = useState(getDefaultPaymentDate());
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !isPending) {
        onClose();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [isPending, onClose]);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const parsedAmount = Number.parseFloat(amount);

    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setError("Payment amount must be greater than zero.");
      return;
    }

    if (parsedAmount > invoice.balanceDue) {
      setError("Payment amount cannot exceed the balance due.");
      return;
    }

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

      onClose();
      router.refresh();
    });
  }

  return (
    <div
      className="fixed inset-0 z-40 flex items-end justify-center p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="record-payment-modal-title"
    >
      <button
        type="button"
        aria-label="Close record payment"
        onClick={onClose}
        disabled={isPending}
        className="absolute inset-0 bg-slate-900/40"
      />
      <div className="relative z-10 flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl border border-slate-200 bg-white shadow-xl sm:max-h-[85vh] sm:rounded-2xl">
        <header className="flex shrink-0 items-center gap-3 border-b border-slate-100 bg-slate-50/70 px-4 py-3.5 sm:px-5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
            <CreditCard className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <h2
              id="record-payment-modal-title"
              className="text-sm font-bold text-slate-900"
            >
              Record payment
            </h2>
            <p className="text-xs text-slate-500">
              Balance due: {formatCurrency(invoice.balanceDue)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            aria-label="Close"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <form
          onSubmit={handleSubmit}
          className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5"
        >
          <div className="grid gap-4 sm:grid-cols-2">
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

          <div className="mt-5 flex items-center justify-end gap-2 border-t border-slate-100 bg-white pt-4 sm:static sm:bg-transparent">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isPending ? "Recording…" : "Record payment"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
