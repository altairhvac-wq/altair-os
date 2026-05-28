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
  getEditInvoiceBlockReason,
  getVoidInvoiceBlockReason,
  type InvoiceDetail,
} from "@/shared/types/invoice";
import { InvoiceEditLinkButton } from "./InvoiceEditLinkButton";

type InvoiceStatusActionsProps = {
  invoice: InvoiceDetail;
  paymentCount: number;
  canManageBilling: boolean;
};

export function InvoiceStatusActions({
  invoice,
  paymentCount,
  canManageBilling,
}: InvoiceStatusActionsProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [resendPending, setResendPending] = useState(false);
  const [showVoidConfirm, setShowVoidConfirm] = useState(false);
  const router = useRouter();

  const canSend = invoice.status === "draft";
  const canResendEmail = canResendInvoiceEmail(invoice.status);
  const canVoid = canVoidInvoice(invoice);
  const canEdit = canEditInvoice(invoice, paymentCount);
  const voidBlockReason = getVoidInvoiceBlockReason(invoice);
  const editBlockReason = getEditInvoiceBlockReason(invoice, paymentCount);

  if (!canManageBilling) {
    return (
      <p className="text-sm text-slate-500">
        You do not have permission to manage invoices.
      </p>
    );
  }

  if (!canSend && !canVoid && !canEdit && !canResendEmail) {
    if (voidBlockReason && invoice.status !== "paid") {
      return <p className="text-xs text-slate-500">{voidBlockReason}</p>;
    }

    if (editBlockReason && canManageBilling) {
      return <p className="text-xs text-slate-500">{editBlockReason}</p>;
    }

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

  if (showVoidConfirm) {
    return (
      <div className="w-full max-w-sm rounded-xl border border-red-200 bg-red-50/70 p-4">
        <p className="text-sm font-semibold text-slate-900">
          Void {invoice.invoiceNumber}?
        </p>
        <p className="mt-1 text-xs text-slate-600">
          This removes the invoice from active billing. This cannot be undone.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={isPending}
            onClick={() => setShowVoidConfirm(false)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isPending}
            onClick={handleVoidInvoice}
            className="rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending ? "Voiding…" : "Void invoice"}
          </button>
        </div>
        {error ? (
          <p className="mt-2 text-sm text-red-600" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <div className="flex flex-wrap gap-2">
        {canEdit ? (
          <InvoiceEditLinkButton
            invoice={invoice}
            paymentCount={paymentCount}
            canManageBilling={canManageBilling}
            className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
          />
        ) : null}

        {canSend ? (
          <button
            type="button"
            disabled={isPending || resendPending}
            onClick={handleSendInvoice}
            className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Send className="h-4 w-4" />
            {isPending ? "Sending…" : "Send invoice"}
          </button>
        ) : null}

        {canResendEmail ? (
          <button
            type="button"
            disabled={isPending || resendPending}
            onClick={handleResendEmail}
            className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Mail className="h-4 w-4" />
            {resendPending ? "Resending…" : "Resend email"}
          </button>
        ) : null}

        {canVoid ? (
          <button
            type="button"
            disabled={isPending || resendPending}
            onClick={() => setShowVoidConfirm(true)}
            className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700 transition-colors hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Ban className="h-4 w-4" />
            Void invoice
          </button>
        ) : null}
      </div>

      {error ? (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
