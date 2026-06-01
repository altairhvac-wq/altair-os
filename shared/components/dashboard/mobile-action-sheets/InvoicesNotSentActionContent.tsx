"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { sendInvoiceAction } from "@/app/actions/invoices";
import {
  MobileActionButton,
  MobileActionRecordRow,
} from "@/shared/components/dashboard/mobile-action-sheets/MobileActionRecordRow";
import type { MobileActionSheetData } from "@/shared/lib/mobile-action-dashboard";
import { canBatchSendInvoice } from "@/shared/lib/invoice-batch-send";
import { INVOICE_PAGE_DRAFT_HREF } from "@/shared/lib/invoice-page-focus";
import { formatCurrency } from "@/shared/types/customer";

type InvoicesNotSentActionContentProps = {
  sheetData: MobileActionSheetData;
  totalCount: number;
};

export function InvoicesNotSentActionContent({
  sheetData,
  totalCount,
}: InvoicesNotSentActionContentProps) {
  const router = useRouter();
  const [pendingInvoiceId, setPendingInvoiceId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const { unsentInvoices, access } = sheetData;
  const canManageBilling = access.canViewBilling;
  const hiddenCount = Math.max(0, totalCount - unsentInvoices.length);

  function handleSend(invoiceId: string) {
    if (isPending) {
      return;
    }

    setError(null);
    setPendingInvoiceId(invoiceId);

    startTransition(async () => {
      try {
        const result = await sendInvoiceAction(invoiceId);

        if (result.error) {
          setError(result.error);
          return;
        }

        router.refresh();
      } finally {
        setPendingInvoiceId(null);
      }
    });
  }

  if (unsentInvoices.length === 0) {
    return (
      <p className="text-sm text-slate-600">
        No draft invoices in the preview. Open invoices for the full list.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {error ? (
        <p className="rounded-lg border border-rose-100 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-800">
          {error}
        </p>
      ) : null}

      <ul className="space-y-1.5">
        {unsentInvoices.map((invoice) => {
          const isRowPending = pendingInvoiceId === invoice.id && isPending;
          const canSend =
            canManageBilling && canBatchSendInvoice(invoice);

          return (
            <MobileActionRecordRow
              key={invoice.id}
              title={`Invoice ${invoice.invoiceNumber}`}
              subtitle={invoice.customerName}
              meta={formatCurrency(invoice.total)}
              actions={
                <>
                  {canSend ? (
                    <MobileActionButton
                      label="Send invoice"
                      onClick={() => handleSend(invoice.id)}
                      pending={isRowPending}
                    />
                  ) : null}
                  <MobileActionButton
                    label="Open invoice"
                    href={`/invoices/${invoice.id}`}
                    variant="secondary"
                  />
                </>
              }
            />
          );
        })}
      </ul>

      {hiddenCount > 0 ? (
        <p className="text-center text-xs font-medium text-slate-500">
          +{hiddenCount} more draft invoices
        </p>
      ) : null}

      <MobileActionButton
        label="View all draft invoices"
        href={INVOICE_PAGE_DRAFT_HREF}
        variant="secondary"
      />
    </div>
  );
}
