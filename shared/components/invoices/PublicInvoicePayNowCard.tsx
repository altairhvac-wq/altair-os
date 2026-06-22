"use client";

import { useState, useTransition } from "react";
import { CreditCard } from "lucide-react";
import { createPublicInvoiceCheckoutSessionAction } from "@/app/actions/public-invoice-checkout";
import { formatActionError } from "@/shared/lib/operational-errors";
import { formatCurrency } from "@/shared/types/customer";

type PublicInvoicePayNowCardProps = {
  token: string;
  balanceDue: number;
};

export function PublicInvoicePayNowCard({
  token,
  balanceDue,
}: PublicInvoicePayNowCardProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handlePayNow() {
    if (isPending) {
      return;
    }

    setError(null);

    startTransition(async () => {
      const result = await createPublicInvoiceCheckoutSessionAction(token);

      if (result.error) {
        setError(
          formatActionError(
            result.error,
            "We couldn't start checkout. Please try again or contact the company.",
          ),
        );
        return;
      }

      if (result.checkoutUrl) {
        window.location.assign(result.checkoutUrl);
      }
    });
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white px-4 py-4 shadow-sm">
      <p className="text-sm font-bold text-slate-900">Pay securely online</p>
      <p className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
        {formatCurrency(balanceDue)}
      </p>
      <p className="mt-1 text-xs text-slate-600">Amount due</p>
      <button
        type="button"
        disabled={isPending}
        onClick={handlePayNow}
        className="mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-teal-700 px-4 py-3 text-base font-bold text-white shadow-sm transition-colors hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <CreditCard className="h-4 w-4 shrink-0" aria-hidden />
        {isPending ? "Redirecting to checkout…" : "Pay Now"}
      </button>
      <p className="mt-3 text-center text-xs leading-snug text-slate-500">
        Payments are processed securely by Stripe.
      </p>
      {error ? (
        <p className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">
          {error}
        </p>
      ) : null}
    </div>
  );
}
