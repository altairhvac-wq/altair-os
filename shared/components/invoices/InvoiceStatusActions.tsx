"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Ban, Mail, Send } from "lucide-react";
import {
  resendInvoiceEmailAction,
  sendInvoiceAction,
  voidInvoiceAction,
} from "@/app/actions/invoices";
import type { BillingEmailDelivery } from "@/lib/email/billing-send";
import { formatBillingEmailSuccessMessage } from "@/shared/lib/billing-email-sent";
import {
  formatActionError,
  formatBillingEmailDeliveryError,
  formatBillingEmailRecipientRedirectWarning,
  getBillingActionFeedbackTone,
  hasValidCustomerEmailForSend,
} from "@/shared/lib/operational-errors";
import { SettingsAlertBanner } from "@/shared/components/settings/SettingsAlertBanner";
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
  customerEmailBlockReason: string | null;
  lastEmailSentMessage?: string | null;
};

export function InvoiceStatusActions({
  invoice,
  paymentCount,
  canManageBilling,
  customerEmailBlockReason,
  lastEmailSentMessage,
}: InvoiceStatusActionsProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [resendPending, setResendPending] = useState(false);
  const [showVoidConfirm, setShowVoidConfirm] = useState(false);
  const [localStatus, setLocalStatus] = useState(invoice.status);
  const [emailDelivery, setEmailDelivery] = useState<
    BillingEmailDelivery | undefined
  >(undefined);
  const router = useRouter();

  useEffect(() => {
    setLocalStatus(invoice.status);
  }, [invoice.status]);

  const customerEmail = invoice.customerEmail?.trim();
  const hasValidCustomerEmail = hasValidCustomerEmailForSend(customerEmail);
  const canSend = localStatus === "draft";
  const canResendEmail = canResendInvoiceEmail(localStatus);
  const canVoid = canVoidInvoice({ ...invoice, status: localStatus });
  const canEdit = canEditInvoice({ ...invoice, status: localStatus }, paymentCount);
  const voidBlockReason = getVoidInvoiceBlockReason({ ...invoice, status: localStatus });
  const editBlockReason = getEditInvoiceBlockReason({ ...invoice, status: localStatus }, paymentCount);
  const emailSendBlocked =
    Boolean(customerEmailBlockReason) && (canSend || canResendEmail);
  const workflowBusy = isPending || resendPending;

  if (!canManageBilling) {
    return null;
  }

  if (!canSend && !canVoid && !canEdit && !canResendEmail) {
    if (voidBlockReason && localStatus !== "paid") {
      return <p className="text-xs text-slate-500">{voidBlockReason}</p>;
    }

    if (editBlockReason && canManageBilling) {
      return <p className="text-xs text-slate-500">{editBlockReason}</p>;
    }

    return null;
  }

  function handleSendInvoice() {
    if (workflowBusy) {
      return;
    }

    if (!hasValidCustomerEmail || !customerEmail) {
      setSuccessMessage(null);
      setError(customerEmailBlockReason ?? "A valid customer email is required.");
      return;
    }

    setError(null);
    setSuccessMessage(null);
    setEmailDelivery(undefined);

    startTransition(async () => {
      const result = await sendInvoiceAction(invoice.id);

      if (result.error) {
        setError(formatActionError(result.error, "We couldn't send this invoice. Try again."));
        router.refresh();
        return;
      }

      if (result.emailDelivery && result.emailDelivery.status !== "sent") {
        setEmailDelivery(result.emailDelivery);
        setError(formatBillingEmailDeliveryError(result.emailDelivery, "invoice", "send"));
        router.refresh();
        return;
      }

      const redirectWarning = result.emailDelivery
        ? formatBillingEmailRecipientRedirectWarning(result.emailDelivery)
        : null;

      setLocalStatus("sent");

      if (redirectWarning) {
        setEmailDelivery(result.emailDelivery);
        setError(redirectWarning);
      } else {
        setSuccessMessage(
          formatBillingEmailSuccessMessage(customerEmail, "send", "invoice"),
        );
      }
      router.refresh();
    });
  }

  function handleResendEmail() {
    if (workflowBusy) {
      return;
    }

    if (!hasValidCustomerEmail || !customerEmail) {
      setSuccessMessage(null);
      setError(customerEmailBlockReason ?? "A valid customer email is required.");
      return;
    }

    setError(null);
    setSuccessMessage(null);
    setEmailDelivery(undefined);
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
          setEmailDelivery(result.emailDelivery);
          setError(formatBillingEmailDeliveryError(result.emailDelivery, "invoice", "resend"));
          return;
        }

        const redirectWarning = result.emailDelivery
          ? formatBillingEmailRecipientRedirectWarning(result.emailDelivery)
          : null;

        if (redirectWarning) {
          setEmailDelivery(result.emailDelivery);
          setError(redirectWarning);
        } else {
          setSuccessMessage(
            formatBillingEmailSuccessMessage(customerEmail, "resend", "invoice"),
          );
        }
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
    setSuccessMessage(null);

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

  const feedbackBanner = error ? (
    <SettingsAlertBanner tone={getBillingActionFeedbackTone(error, emailDelivery)}>
      {error}
      {getBillingActionFeedbackTone(error, emailDelivery) === "warning" ? (
        <span className="mt-1 block text-xs opacity-90">
          Refresh this page to confirm the current status before retrying.
        </span>
      ) : null}
    </SettingsAlertBanner>
  ) : null;

  const successBanner = successMessage ? (
    <SettingsAlertBanner tone="success">{successMessage}</SettingsAlertBanner>
  ) : null;

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
          <div className="mt-2">{feedbackBanner}</div>
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
            disabled={workflowBusy || !hasValidCustomerEmail}
            onClick={handleSendInvoice}
            title={
              hasValidCustomerEmail
                ? "Emails the invoice and marks it as sent."
                : customerEmailBlockReason ?? undefined
            }
            className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Send className="h-4 w-4" />
            {isPending ? "Sending…" : "Send to customer"}
          </button>
        ) : null}

        {canResendEmail ? (
          <button
            type="button"
            disabled={workflowBusy || !hasValidCustomerEmail}
            onClick={handleResendEmail}
            title={
              hasValidCustomerEmail
                ? "Sends another copy to the customer's email on file."
                : customerEmailBlockReason ?? undefined
            }
            className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Mail className="h-4 w-4" />
            {resendPending ? "Resending…" : "Resend to customer"}
          </button>
        ) : null}

        {canVoid ? (
          <button
            type="button"
            disabled={workflowBusy}
            onClick={() => setShowVoidConfirm(true)}
            className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700 transition-colors hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Ban className="h-4 w-4" />
            Void invoice
          </button>
        ) : null}
      </div>

      {emailSendBlocked && customerEmailBlockReason ? (
        <p className="text-xs text-slate-500">{customerEmailBlockReason}</p>
      ) : canSend ? (
        <p className="text-xs text-slate-500">
          Send emails the invoice to the customer on file.
        </p>
      ) : canResendEmail ? (
        <p className="text-xs text-slate-500">
          {lastEmailSentMessage ??
            "Resend sends another copy to the customer's email on file."}
        </p>
      ) : null}

      {successBanner}
      {feedbackBanner}
    </div>
  );
}
