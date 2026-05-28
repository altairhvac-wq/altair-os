"use client";

import Link from "next/link";
import { Pencil } from "lucide-react";
import {
  canEditInvoice,
  getEditInvoiceBlockReason,
  type Invoice,
} from "@/shared/types/invoice";

type InvoiceEditLinkButtonProps = {
  invoice: Invoice;
  paymentCount: number;
  canManageBilling: boolean;
  className?: string;
  showBlockReason?: boolean;
};

export function InvoiceEditLinkButton({
  invoice,
  paymentCount,
  canManageBilling,
  className = "inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50",
  showBlockReason = false,
}: InvoiceEditLinkButtonProps) {
  if (!canManageBilling) {
    return null;
  }

  const canEdit = canEditInvoice(invoice, paymentCount);
  const blockReason = getEditInvoiceBlockReason(invoice, paymentCount);

  if (canEdit) {
    return (
      <Link
        href={`/invoices/${invoice.id}/edit`}
        className={className}
        title="Update line items, dates, or notes before sending."
      >
        <Pencil className="h-4 w-4" />
        Edit invoice
      </Link>
    );
  }

  if (!showBlockReason || !blockReason) {
    return null;
  }

  return <p className="text-xs text-slate-500">{blockReason}</p>;
}
