"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Ban, Mail, Send } from "lucide-react";
import {
  resendInvoiceEmailAction,
  sendInvoiceAction,
  voidInvoiceAction,
} from "@/app/actions/invoices";
import {
  formatActionError,
  formatBillingEmailDeliveryError,
  MISSING_CUSTOMER_EMAIL_SEND_REASON,
} from "@/shared/lib/operational-errors";
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
  const [localStatus, setLocalStatus] = useState(invoice.status);
  const router = useRouter();

  useEffect(() => {
    setLocalStatus(invoice.status);
  }, [invoice.status]);

  const customerEmail = invoice.customerEmail?.trim();
  const hasCustomerEmail = Boolean(customerEmail);

  if (!canManageBilling) {
    return null;
  }

  const canSend = localStatus === "draft";
  const canResendEmail = canResendInvoiceEmail(localStatus);
  const canVoid = canVoidInvoice({ ...invoice, status: localStatus });
  const canEdit = canEditInvoice({ ...invoice, status: localStatus }, paymentCount);
  const voidBlockReason = getVoidInvoiceBlockReason({ ...invoice, status: localStatus });
  const emailSendBlocked = !hasCustomerEmail && (canSend || canResendEmail);
  const workflowBusy = isPending || resendPending;
  const showActions =
    canSend || canResendEmail || canVoid || canRecordPayment || canEdit;

  if (!showActions) {
    return null;
  }

  function handleSendInvoice() {
    if (workflowBusy) {
      return;
    }

    if (!hasCustomerEmail) {
      setError(MISSING_CUSTOMER_EMAIL_SEND_REASON);
      return;
    }

    setError(null);

    startTransition(async () => {
      const result = await sendInvoiceAction(invoice.id);

      if (result.error) {
        setError(formatActionError(result.error, "We couldn't send this invoice. Try again."));
        router.refresh();
        return;
      }

      if (result.emailDelivery && result.emailDelivery.status !== "sent") {
        setError(formatBillingEmailDeliveryError(result.emailDelivery, "invoice", "send"));
        router.refresh();
        return;
      }

      setLocalStatus("sent");
      setShowVoidConfirm(false);
      router.refresh();
    });
  }

  function handleResendEmail() {
    if (workflowBusy) {
      return;
    }

    if (!hasCustomerEmail) {
      setError(MISSING_CUSTOMER_EMAIL_SEND_REASON);
      return;
    }

    setError(null);
    setResendPending(true);

    startTransition(async () => {
      try {
        const result = await resendInvoiceEmailAction(invoice.id);

        if (result.error) {
          setError(formatActionError(result.error, "Invoice email could not be resent. Try again."));
          return;
        }

        if (
          result.emailDelivery &&
          result.emailDelivery.status !== "sent"
        ) {
          setError(formatBillingEmailDeliveryError(result.emailDelivery, "invoice", "resend"));
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
    if (workflowBusy) {
      return;
    }

    setError(null);

    startTransition(async () => {
      const result = await voidInvoiceAction(invoice.id);

      if (result.error) {
        setError(formatActionError(result.error, "We couldn't void this invoice. Try again."));
        return;
      }

      setLocalStatus("void");
      setShowVoidConfirm(false);
      router.refresh();
    });
  }

  const actionsDisabled = workflowBusy;

  const containerClass =
    variant === "sticky"
      ? "fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-8px_24px_rgba(15,23,42,0.08)] backdrop-blur supports-[backdrop-filter]:bg-white/90 sm:hidden"
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
          <div className="flex min-w-0 flex-wrap gap-2">
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
                disabled={actionsDisabled}
                onClick={onRecordPayment}
                title="Record all or part of the balance due."
                className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Record payment
              </button>
            ) : null}

            {canSend ? (
              <button
                type="button"
                disabled={actionsDisabled || !hasCustomerEmail}
                onClick={handleSendInvoice}
                title={
                  hasCustomerEmail
                    ? "Emails the invoice and marks it as sent."
                    : MISSING_CUSTOMER_EMAIL_SEND_REASON
                }
                className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Send className="h-4 w-4" />
                {isPending ? "Sending…" : "Send invoice"}
              </button>
            ) : null}

            {canResendEmail ? (
              <button
                type="button"
                disabled={actionsDisabled || !hasCustomerEmail}
                onClick={handleResendEmail}
                title={
                  hasCustomerEmail
                    ? "Sends another copy to the customer's email on file."
                    : MISSING_CUSTOMER_EMAIL_SEND_REASON
                }
                className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Mail className="h-4 w-4" />
                {resendPending ? "Resending…" : "Resend email"}
              </button>
            ) : null}

            {canVoid ? (
              <button
                type="button"
                disabled={actionsDisabled}
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

        {variant === "sticky" ? (() => {
          const helperText = emailSendBlocked
            ? MISSING_CUSTOMER_EMAIL_SEND_REASON
            : !canRecordPayment && recordPaymentBlockReason
              ? recordPaymentBlockReason
              : canSend
                ? "Send emails the invoice to the customer on file."
                : canResendEmail
                  ? "Resend sends another copy to the customer's email on file."
                  : canRecordPayment
                    ? "Record when the customer pays all or part of the balance due."
                    : null;

          return helperText ? (
            <p className="mt-2 text-xs text-slate-500">{helperText}</p>
          ) : null;
        })() : null}

        {!canVoid && voidBlockReason && canSend === false && variant !== "sticky" ? (
          <p className="text-xs text-slate-500">{voidBlockReason}</p>
        ) : null}
      </div>

      {variant === "sticky" ? <div className="h-36 sm:hidden" aria-hidden /> : null}
    </>
  );
}
