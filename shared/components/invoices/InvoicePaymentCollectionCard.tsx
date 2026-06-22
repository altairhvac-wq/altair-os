"use client";

import { useState, useTransition } from "react";
import dynamic from "next/dynamic";
import { Copy, ExternalLink, Link2, Mail, RefreshCw } from "lucide-react";
import {
  createInvoicePaymentLinkAction,
  sendInvoicePaymentLinkEmailAction,
} from "@/app/actions/invoice-payment-links";
import { formatCurrency } from "@/shared/types/customer";
import {
  northStarDetailTokens as dt,
  northStarInvoiceDocumentTokens as idt,
} from "@/shared/design-system/north-star/tokens";

const QRCode = dynamic(() => import("react-qr-code"), {
  ssr: false,
  loading: () => (
    <div
      className="h-[180px] w-[180px] animate-pulse rounded-lg bg-slate-100"
      aria-hidden
    />
  ),
});

type InvoicePaymentCollectionCardProps = {
  invoiceId: string;
  jobId?: string;
  balanceDue: number;
  onlinePaymentsEnabled: boolean;
  northStar?: boolean;
  fieldVariant?: boolean;
};

export function InvoicePaymentCollectionCard({
  invoiceId,
  jobId,
  balanceDue,
  onlinePaymentsEnabled,
  northStar = false,
  fieldVariant = false,
}: InvoicePaymentCollectionCardProps) {
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailSuccess, setEmailSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isEmailPending, startEmailTransition] = useTransition();

  function handleCreateLink(refresh = false) {
    setError(null);
    setEmailSuccess(null);

    if (refresh) {
      setPaymentUrl(null);
      setCopied(false);
    }

    startTransition(async () => {
      const result = await createInvoicePaymentLinkAction({ invoiceId, jobId });

      if (result.error || !result.paymentUrl) {
        setError(result.error ?? "Could not create payment link.");
        return;
      }

      setPaymentUrl(result.paymentUrl);
    });
  }

  function handleEmailPaymentLink() {
    setError(null);
    setEmailSuccess(null);

    startEmailTransition(async () => {
      const result = await sendInvoicePaymentLinkEmailAction({ invoiceId, jobId });

      if (result.error) {
        if (result.paymentUrl) {
          setPaymentUrl(result.paymentUrl);
        }
        setError(result.error);
        return;
      }

      if (result.paymentUrl) {
        setPaymentUrl(result.paymentUrl);
      }

      setEmailSuccess(
        result.recipientEmail
          ? `Payment link emailed to ${result.recipientEmail}.`
          : "Payment link emailed to the customer.",
      );
    });
  }

  async function handleCopyLink() {
    setError(null);
    setEmailSuccess(null);

    if (!paymentUrl) {
      startTransition(async () => {
        const result = await createInvoicePaymentLinkAction({ invoiceId, jobId });

        if (result.error || !result.paymentUrl) {
          setError(result.error ?? "Could not create payment link.");
          return;
        }

        setPaymentUrl(result.paymentUrl);

        try {
          await navigator.clipboard.writeText(result.paymentUrl);
          setCopied(true);
          window.setTimeout(() => setCopied(false), 2500);
        } catch {
          setError(
            "Could not copy to clipboard. Copy the link manually if shown.",
          );
        }
      });
      return;
    }

    try {
      await navigator.clipboard.writeText(paymentUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      setError("Could not copy to clipboard. Copy the link manually if shown.");
    }
  }

  const sectionClass = northStar
    ? dt.compactSectionSurface
    : fieldVariant
      ? "rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
      : "rounded-xl border border-slate-200 bg-white p-4";

  const titleClass = northStar
    ? `${dt.sectionTitle} ${idt.ivoryPrimary}`
    : "text-xs font-semibold uppercase tracking-wide text-slate-500";

  const bodyClass = northStar
    ? `text-sm leading-relaxed ${idt.ivorySecondary}`
    : "text-sm leading-relaxed text-slate-600";

  const mutedClass = northStar
    ? `text-xs ${idt.ivoryMuted}`
    : "text-xs text-slate-500";

  const primaryButtonClass = northStar
    ? `${dt.primaryAction} disabled:cursor-not-allowed disabled:opacity-60`
    : fieldVariant
      ? "inline-flex min-h-11 w-full touch-manipulation items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
      : "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60";

  const secondaryButtonClass = northStar
    ? `${dt.secondaryAction} disabled:cursor-not-allowed disabled:opacity-60`
    : fieldVariant
      ? "inline-flex min-h-11 w-full touch-manipulation items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
      : "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60";

  const disabledSecondaryButtonClass = northStar
    ? `${dt.secondaryAction} cursor-not-allowed opacity-50`
    : fieldVariant
      ? "inline-flex min-h-11 w-full touch-manipulation cursor-not-allowed items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-400 opacity-60"
      : "inline-flex min-h-11 cursor-not-allowed items-center justify-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-400 opacity-60";

  const workflowBusy = isPending || isEmailPending;

  if (!onlinePaymentsEnabled) {
    return (
      <section className={sectionClass}>
        <div className="flex items-start gap-3">
          <Link2
            className={`mt-0.5 h-4 w-4 shrink-0 ${northStar ? "text-[#8A6324]" : "text-slate-400"}`}
            aria-hidden
          />
          <div className="min-w-0 flex-1">
            <h2 className={titleClass}>Collect payment</h2>
            <p className={`mt-2 ${bodyClass}`}>
              Online payments are not enabled for this company yet.
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className={sectionClass}>
      <div className="flex items-start gap-3">
        <Link2
          className={`mt-0.5 h-4 w-4 shrink-0 ${northStar ? "text-[#8A6324]" : "text-emerald-600"}`}
          aria-hidden
        />
        <div className="min-w-0 flex-1">
          <h2 className={titleClass}>Collect payment</h2>
          <p className={`mt-2 font-semibold ${northStar ? idt.ivoryPrimary : "text-slate-900"}`}>
            Amount due: {formatCurrency(balanceDue)}
          </p>
          <p className={`mt-2 ${bodyClass}`}>
            Have the customer scan this QR code or open the secure payment link.
            Payment is processed securely through Stripe.
          </p>

          {paymentUrl ? (
            <div className="mt-4 flex flex-col items-center gap-4 sm:flex-row sm:items-start">
              <div className="rounded-xl border border-slate-200 bg-white p-3">
                <QRCode
                  value={paymentUrl}
                  size={180}
                  level="M"
                  aria-label="QR code for invoice payment link"
                />
              </div>
              <div className="min-w-0 flex-1 space-y-3">
                <p className={`break-all ${mutedClass}`}>{paymentUrl}</p>
                <div className={`flex flex-col gap-2 ${fieldVariant ? "" : "sm:flex-row sm:flex-wrap"}`}>
                  <button
                    type="button"
                    onClick={() => handleCopyLink()}
                    disabled={workflowBusy}
                    className={secondaryButtonClass}
                  >
                    <Copy className="h-4 w-4 shrink-0" aria-hidden />
                    {copied ? "Copied payment link" : "Copy link"}
                  </button>
                  <a
                    href={paymentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={secondaryButtonClass}
                  >
                    <ExternalLink className="h-4 w-4 shrink-0" aria-hidden />
                    Open payment page
                  </a>
                  <button
                    type="button"
                    onClick={() => handleCreateLink(true)}
                    disabled={workflowBusy}
                    className={secondaryButtonClass}
                  >
                    <RefreshCw className="h-4 w-4 shrink-0" aria-hidden />
                    {isPending ? "Refreshing link…" : "Refresh link"}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              <button
                type="button"
                onClick={() => handleCreateLink(false)}
                disabled={workflowBusy}
                className={primaryButtonClass}
              >
                {isPending ? "Creating link…" : "Create payment link"}
              </button>
              <p className={mutedClass}>
                The customer pays on their own device. Creating a link does not
                record a payment.
              </p>
            </div>
          )}

          <div className={`mt-4 flex flex-col gap-2 ${fieldVariant ? "" : "sm:flex-row sm:flex-wrap"}`}>
            <button
              type="button"
              onClick={handleEmailPaymentLink}
              disabled={workflowBusy}
              className={secondaryButtonClass}
            >
              <Mail className="h-4 w-4 shrink-0" aria-hidden />
              {isEmailPending ? "Sending email…" : "Email payment link"}
            </button>
            <button
              type="button"
              disabled
              aria-disabled="true"
              title="Text message sending is not configured yet."
              className={disabledSecondaryButtonClass}
            >
              Text payment link
            </button>
          </div>
          <p className={`mt-2 ${mutedClass}`}>
            Text message sending is not configured yet. Use Email, Copy link, or
            QR code for now.
          </p>

          {emailSuccess ? (
            <p className="mt-3 text-sm text-emerald-800" role="status">
              {emailSuccess}
            </p>
          ) : null}

          {error ? (
            <p className="mt-3 text-sm text-amber-800" role="alert">
              {error}
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
