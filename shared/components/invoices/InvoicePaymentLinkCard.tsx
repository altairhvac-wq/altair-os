"use client";

import { useState, useTransition } from "react";
import { Copy, Link2 } from "lucide-react";
import { copyInvoicePaymentLinkAction } from "@/app/actions/invoice-payment-link";

type InvoicePaymentLinkCardProps = {
  invoiceId: string;
};

export function InvoicePaymentLinkCard({ invoiceId }: InvoicePaymentLinkCardProps) {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleCopyLink() {
    setError(null);

    startTransition(async () => {
      const result = await copyInvoicePaymentLinkAction(invoiceId);

      if (result.error || !result.paymentUrl) {
        setError(result.error ?? "Could not create payment link.");
        return;
      }

      try {
        await navigator.clipboard.writeText(result.paymentUrl);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 2500);
      } catch {
        setError("Could not copy to clipboard. Copy the link manually if shown.");
      }
    });
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-start gap-3">
        <Link2 className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" aria-hidden />
        <div className="min-w-0 flex-1">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Customer payment link
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            Share a secure link so customers can view this invoice and contact
            the office to pay. Resending the invoice email also generates a
            fresh link.
          </p>
          <button
            type="button"
            onClick={handleCopyLink}
            disabled={isPending}
            className="mt-4 inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Copy className="h-4 w-4 shrink-0" aria-hidden />
            {isPending
              ? "Creating link…"
              : copied
                ? "Copied payment link"
                : "Copy payment link"}
          </button>
          {error ? (
            <p className="mt-3 text-sm text-amber-800" role="alert">
              {error}
            </p>
          ) : (
            <p className="mt-3 text-xs text-slate-500">
              Copying creates a new link and replaces any previous unused
              payment links for this invoice.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
