"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CreditCard } from "lucide-react";
import {
  MobileSheet,
  MobileSheetBody,
  MobileSheetFooter,
  MobileSheetHeader,
  MobileSheetHeaderIcon,
  MobileSheetPanel,
} from "@/shared/components/ui/mobile-sheet";
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

const RECORD_PAYMENT_TITLE_ID = "record-payment-modal-title";

function RecordPaymentModal({ invoice, onClose }: RecordPaymentModalProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [amount, setAmount] = useState(String(invoice.balanceDue));
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [paymentDate, setPaymentDate] = useState(getDefaultPaymentDate());
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isPending) {
      return;
    }

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
    <MobileSheet
      onClose={onClose}
      closeDisabled={isPending}
      ariaLabelledBy={RECORD_PAYMENT_TITLE_ID}
      variant="responsive"
    >
      <MobileSheetPanel maxWidth="lg" maxHeight="90" responsiveRounded>
        <MobileSheetHeader
          titleId={RECORD_PAYMENT_TITLE_ID}
          title="Record a payment against the balance due."
          subtitle={`Amount due: ${formatCurrency(invoice.balanceDue)}`}
          onClose={onClose}
          closeDisabled={isPending}
          icon={
            <MobileSheetHeaderIcon className="h-9 w-9 bg-emerald-100 text-emerald-700">
              <CreditCard className="h-4 w-4" />
            </MobileSheetHeaderIcon>
          }
        />

        <form
          id="record-payment-form"
          onSubmit={handleSubmit}
          className="flex min-h-0 flex-1 flex-col"
        >
          <MobileSheetBody>
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
          </MobileSheetBody>

          <MobileSheetFooter className="justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="inline-flex min-h-11 items-center justify-center rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="inline-flex min-h-11 items-center justify-center rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isPending ? "Recording…" : "Record payment"}
            </button>
          </MobileSheetFooter>
        </form>
      </MobileSheetPanel>
    </MobileSheet>
  );
}
