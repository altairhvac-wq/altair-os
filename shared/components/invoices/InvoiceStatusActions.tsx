"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { sendInvoiceAction } from "@/app/actions/invoices";
import type { InvoiceDetail } from "@/shared/types/invoice";

type InvoiceStatusActionsProps = {
  invoice: InvoiceDetail;
  canManageBilling: boolean;
};

export function InvoiceStatusActions({
  invoice,
  canManageBilling,
}: InvoiceStatusActionsProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  if (invoice.status !== "draft") {
    return null;
  }

  if (!canManageBilling) {
    return (
      <p className="text-sm text-slate-500">
        You do not have permission to send invoices.
      </p>
    );
  }

  function handleSendInvoice() {
    setError(null);

    startTransition(async () => {
      const result = await sendInvoiceAction(invoice.id);

      if (result.error) {
        setError(result.error);
        return;
      }

      router.refresh();
    });
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <button
        type="button"
        disabled={isPending}
        onClick={handleSendInvoice}
        className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? "Sending…" : "Send invoice"}
      </button>
      {error ? (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
