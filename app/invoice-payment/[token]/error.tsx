"use client";

import { useEffect } from "react";
import { PublicDocumentMessage } from "@/shared/components/public/PublicDocumentMessage";

export default function InvoicePaymentError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[public-invoice-payment]", error);
  }, [error]);

  return (
    <PublicDocumentMessage
      title="We couldn't load this invoice"
      body="Something went wrong on our end. Nothing you did caused this, and nothing has been charged. Try again — and if it keeps happening, contact the company that sent you this link."
    >
      <button
        type="button"
        onClick={reset}
        className="inline-flex items-center rounded-full bg-slate-900 px-6 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2"
      >
        Try again
      </button>
    </PublicDocumentMessage>
  );
}
