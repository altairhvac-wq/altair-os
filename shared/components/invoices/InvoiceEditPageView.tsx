"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { updateInvoiceAction } from "@/app/actions/invoices";
import {
  canEditInvoice,
  getEditInvoiceBlockReason,
  type InvoiceDetail,
  type InvoiceEditFormData,
} from "@/shared/types/invoice";
import type { ServiceItem } from "@/shared/types/service-item";
import { adminPanelBodyClass } from "@/shared/lib/admin-density";
import {
  MasterContentStack,
  MasterPageCanvas,
  MasterPageHeader,
  MasterPageSurface,
  MasterShellPage,
} from "@/shared/design-system/shell";
import { InvoiceEditForm } from "./InvoiceEditForm";

type InvoiceEditPageViewProps = {
  invoice: InvoiceDetail;
  serviceItems: ServiceItem[];
  paymentCount: number;
  canManageBilling: boolean;
};

export function InvoiceEditPageView({
  invoice,
  serviceItems,
  paymentCount,
  canManageBilling,
}: InvoiceEditPageViewProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const canEdit = canManageBilling && canEditInvoice(invoice, paymentCount);
  const editBlockReason = canManageBilling
    ? getEditInvoiceBlockReason(invoice, paymentCount)
    : "You do not have permission to edit invoices.";

  function handleSubmit(data: InvoiceEditFormData) {
    if (isPending) {
      return;
    }

    setError(null);
    setSuccessMessage(null);

    startTransition(async () => {
      const result = await updateInvoiceAction(invoice.id, data);

      if (result.error) {
        setError(result.error);
        return;
      }

      setSuccessMessage("Invoice updated.");
      router.push(`/invoices/${invoice.id}`);
      router.refresh();
    });
  }

  return (
    <MasterShellPage density="compact">
      <MasterPageCanvas width="standard" className="max-w-3xl pb-4">
        <MasterContentStack density="compact">
          <Link
            href={`/invoices/${invoice.id}`}
            className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-slate-600 transition-colors hover:text-slate-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to {invoice.invoiceNumber}
          </Link>

          <MasterPageHeader
            title="Edit invoice"
            subtitle={
              paymentCount > 0
                ? `${paymentCount} payment${paymentCount === 1 ? "" : "s"} recorded — limited edits`
                : undefined
            }
            density="compact"
          />

          <MasterPageSurface variant="card">
            <div className={adminPanelBodyClass}>
              {successMessage ? (
                <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-800">
                  {successMessage}
                </div>
              ) : null}

              {canEdit ? (
                <InvoiceEditForm
                  invoice={invoice}
                  serviceItems={serviceItems}
                  onSubmit={handleSubmit}
                  onCancel={() => router.push(`/invoices/${invoice.id}`)}
                  error={error}
                  isSubmitting={isPending}
                />
              ) : (
                <div className="rounded-xl border border-amber-200 bg-amber-50/80 px-4 py-4">
                  <p className="text-sm font-medium text-amber-900">
                    This invoice cannot be edited
                  </p>
                  <p className="mt-1 text-sm text-amber-800">{editBlockReason}</p>
                  <Link
                    href={`/invoices/${invoice.id}`}
                    className="mt-4 inline-flex min-h-11 items-center rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
                  >
                    Return to invoice
                  </Link>
                </div>
              )}
            </div>
          </MasterPageSurface>
        </MasterContentStack>
      </MasterPageCanvas>
    </MasterShellPage>
  );
}
