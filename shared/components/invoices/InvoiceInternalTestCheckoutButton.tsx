"use client";

import { useState, useTransition } from "react";
import { CreditCard } from "lucide-react";
import { createInvoiceCheckoutSessionAction } from "@/app/actions/invoice-checkout";
import { formatActionError } from "@/shared/lib/operational-errors";
import { isInvoicePayable } from "@/shared/types/invoice-payment";
import type { InvoiceDetail } from "@/shared/types/invoice";
import { SettingsAlertBanner } from "@/shared/components/settings/SettingsAlertBanner";

type InvoiceInternalTestCheckoutButtonProps = {
  invoice: Pick<InvoiceDetail, "id" | "status" | "balanceDue" | "invoiceNumber">;
  canManageBilling: boolean;
};

export function InvoiceInternalTestCheckoutButton({
  invoice,
  canManageBilling,
}: InvoiceInternalTestCheckoutButtonProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (!canManageBilling || !isInvoicePayable(invoice.status) || invoice.balanceDue <= 0) {
    return null;
  }

  function handleCreateTestCheckout() {
    if (isPending) {
      return;
    }

    setError(null);

    startTransition(async () => {
      const result = await createInvoiceCheckoutSessionAction(invoice.id);

      if (result.error) {
        setError(
          formatActionError(
            result.error,
            "We couldn't create a test checkout session. Try again.",
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
    <div className="mt-3 rounded-lg border border-dashed border-amber-300 bg-amber-50/80 p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-amber-900">
        Internal test only
      </p>
      <p className="mt-1 text-xs text-amber-900/80">
        Internal test only. Successful Stripe payments are recorded by webhook if
        migration 101 is applied and webhooks are configured.
      </p>
      <button
        type="button"
        disabled={isPending}
        onClick={handleCreateTestCheckout}
        className="mt-3 inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-amber-400 bg-white px-3 py-2 text-sm font-semibold text-amber-950 transition-colors hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <CreditCard className="h-4 w-4" />
        {isPending ? "Creating test checkout…" : "Test Stripe checkout (internal)"}
      </button>
      {error ? (
        <div className="mt-2">
          <SettingsAlertBanner tone="error">{error}</SettingsAlertBanner>
        </div>
      ) : null}
    </div>
  );
}
