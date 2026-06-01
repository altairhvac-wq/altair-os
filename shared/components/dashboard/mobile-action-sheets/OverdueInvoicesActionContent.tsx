"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { resendInvoiceEmailAction } from "@/app/actions/invoices";
import {
  MobileActionButton,
  MobileActionRecordRow,
} from "@/shared/components/dashboard/mobile-action-sheets/MobileActionRecordRow";
import type { MobileActionSheetData } from "@/shared/lib/mobile-action-dashboard";
import { hasValidCustomerEmailForSend } from "@/shared/lib/operational-errors";
import { formatCurrency } from "@/shared/types/customer";
import { canRecordInvoicePayment } from "@/shared/types/invoice-payment";
import { canResendInvoiceEmail } from "@/shared/types/invoice";

type OverdueInvoicesActionContentProps = {
  sheetData: MobileActionSheetData;
  totalCount: number;
};

export function OverdueInvoicesActionContent({
  sheetData,
  totalCount,
}: OverdueInvoicesActionContentProps) {
  const router = useRouter();
  const [pendingInvoiceId, setPendingInvoiceId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const { overdueInvoices, access } = sheetData;
  const canManageBilling = access.canViewBilling;
  const hiddenCount = Math.max(0, totalCount - overdueInvoices.length);

  function handleResend(invoiceId: string) {
    if (isPending) {
      return;
    }

    setError(null);
    setPendingInvoiceId(invoiceId);

    startTransition(async () => {
      try {
        const result = await resendInvoiceEmailAction(invoiceId);

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

  if (overdueInvoices.length === 0) {
    return (
      <p className="text-sm text-slate-600">
        No overdue invoices in the preview. Open invoices for the full list.
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
        {overdueInvoices.map((invoice) => {
          const isRowPending = pendingInvoiceId === invoice.id && isPending;
          const canResend =
            canManageBilling &&
            canResendInvoiceEmail(invoice.status) &&
            hasValidCustomerEmailForSend(invoice.customerEmail);
          const canRecordPayment =
            canManageBilling &&
            canRecordInvoicePayment({
              status: invoice.status,
              balanceDue: invoice.balanceDue,
            });

          return (
            <MobileActionRecordRow
              key={invoice.id}
              title={`Invoice ${invoice.invoiceNumber}`}
              subtitle={invoice.customerName}
              meta={`${formatCurrency(invoice.balanceDue)} due · Due ${invoice.dueDate}`}
              actions={
                <>
                  {canResend ? (
                    <MobileActionButton
                      label="Resend"
                      onClick={() => handleResend(invoice.id)}
                      pending={isRowPending}
                    />
                  ) : null}
                  {canRecordPayment ? (
                    <MobileActionButton
                      label="Record payment"
                      href={`/invoices/${invoice.id}`}
                      variant="secondary"
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
          +{hiddenCount} more overdue
        </p>
      ) : null}

      <MobileActionButton
        label="View all overdue"
        href="/invoices?focus=overdue"
        variant="secondary"
      />
    </div>
  );
}
