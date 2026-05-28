"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Ban, Mail, Send } from "lucide-react";
import {
  resendInvoiceEmailAction,
  sendInvoiceAction,
  voidInvoiceAction,
} from "@/app/actions/invoices";
import {
  canEditInvoice,
  canResendInvoiceEmail,
  canVoidInvoice,
  getVoidInvoiceBlockReason,
  type InvoiceDetail,
} from "@/shared/types/invoice";
import { InvoiceEditLinkButton } from "./InvoiceEditLinkButton";

type InvoiceDetailActionBarProps = {
  invoice: InvoiceDetail;
  paymentCount: number;
  canManageBilling: boolean;
  onRecordPayment: () => void;
  canRecordPayment: boolean;
  recordPaymentBlockReason: string | null;
  variant?: "inline" | "sticky";
};

export function InvoiceDetailActionBar({
  invoice,
  paymentCount,
  canManageBilling,
  onRecordPayment,
  canRecordPayment,
  recordPaymentBlockReason,
  variant = "inline",
}: InvoiceDetailActionBarProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [resendPending, setResendPending] = useState(false);
  const [showVoidConfirm, setShowVoidConfirm] = useState(false);
  const router = useRouter();

  if (!canManageBilling) {
    return null;
  }

  const canSend = invoice.status === "draft";
  const canResendEmail = canResendInvoiceEmail(invoice.status);
  const canVoid = canVoidInvoice(invoice);
  const canEdit = canEditInvoice(invoice, paymentCount);
  const voidBlockReason = getVoidInvoiceBlockReason(invoice);
  const showActions =
    canSend || canResendEmail || canVoid || canRecordPayment || canEdit;

  if (!showActions) {
    return null;
  }

  function handleSendInvoice() {
    setError(null);

    startTransition(async () => {
      const result = await sendInvoiceAction(invoice.id);

      if (result.error) {
        setError(result.error);
        return;
      }

      if (result.emailDelivery && result.emailDelivery.status !== "sent") {
        setError(
          result.emailDelivery.message ??
            "Invoice could not be sent by email. It remains a draft.",
        );
        return;
      }

      setShowVoidConfirm(false);
      router.refresh();
    });
  }

  function handleResendEmail() {
    setError(null);
    setResendPending(true);

    startTransition(async () => {
      try {
        const result = await resendInvoiceEmailAction(invoice.id);

        if (result.error) {
          setError(result.error);
          return;
        }

        if (
          result.emailDelivery &&
          result.emailDelivery.status !== "sent"
        ) {
          setError(
            result.emailDelivery.message ??
              "Invoice email could not be resent. Try again.",
          );
          return;
        }

        setShowVoidConfirm(false);
        router.refresh();
      } finally {
        setResendPending(false);
      }
    });
  }

  function handleVoidInvoice() {
    setError(null);

    startTransition(async () => {
      const result = await voidInvoiceAction(invoice.id);

      if (result.error) {
        setError(result.error);
        return;
      }

      setShowVoidConfirm(false);
      router.refresh();
    });
  }

  const containerClass =
    variant === "sticky"
      ? "fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 px-4 py-3 shadow-[0_-8px_24px_rgba(15,23,42,0.08)] backdrop-blur supports-[backdrop-filter]:bg-white/90 sm:hidden"
      : "hidden sm:flex sm:flex-col sm:items-end sm:gap-2";

  return (
    <>
      <div className={containerClass}>
        {showVoidConfirm ? (
          <div className="space-y-3">
            <p className="text-sm font-medium text-slate-900">
              Void {invoice.invoiceNumber}?
            </p>
            <p className="text-xs text-slate-500">
              This removes the invoice from active billing. This cannot be undone.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={isPending}
                onClick={() => setShowVoidConfirm(false)}
                className="min-h-11 flex-1 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={handleVoidInvoice}
                className="min-h-11 flex-1 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isPending ? "Voiding…" : "Void invoice"}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {canEdit ? (
              <InvoiceEditLinkButton
                invoice={invoice}
                paymentCount={paymentCount}
                canManageBilling={canManageBilling}
              />
            ) : null}

            {canRecordPayment ? (
              <button
                type="button"
                onClick={onRecordPayment}
                className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700"
              >
                Record payment
              </button>
            ) : null}

            {canSend ? (
              <button
                type="button"
                disabled={isPending || resendPending}
                onClick={handleSendInvoice}
                className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Send className="h-4 w-4" />
                {isPending ? "Sending…" : "Send"}
              </button>
            ) : null}

            {canResendEmail ? (
              <button
                type="button"
                disabled={isPending || resendPending}
                onClick={handleResendEmail}
                className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Mail className="h-4 w-4" />
                {resendPending ? "Resending…" : "Resend"}
              </button>
            ) : null}

            {canVoid ? (
              <button
                type="button"
                disabled={isPending || resendPending}
                onClick={() => setShowVoidConfirm(true)}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700 transition-colors hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Ban className="h-4 w-4" />
                Void
              </button>
            ) : null}
          </div>
        )}

        {error ? (
          <p className="mt-2 text-sm text-red-600" role="alert">
            {error}
          </p>
        ) : null}

        {!canRecordPayment && recordPaymentBlockReason && variant === "sticky" ? (
          <p className="mt-2 text-xs text-slate-500">{recordPaymentBlockReason}</p>
        ) : null}

        {!canVoid && voidBlockReason && canSend === false && variant !== "sticky" ? (
          <p className="text-xs text-slate-500">{voidBlockReason}</p>
        ) : null}
      </div>

      {variant === "sticky" ? <div className="h-24 sm:hidden" aria-hidden /> : null}
    </>
  );
}
