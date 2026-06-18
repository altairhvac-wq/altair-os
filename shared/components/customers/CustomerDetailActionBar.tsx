import Link from "next/link";
import { DollarSign, FileText, Plus, Receipt } from "lucide-react";
import {
  createEstimateForCustomerHref,
  createInvoiceForCustomerHref,
  createJobForCustomerHref,
} from "@/shared/lib/customers/customer-action-links";
import type { Invoice } from "@/shared/types/invoice";
import { hasInvoiceUnpaidBalance } from "@/shared/types/invoice";
import { northStarDetailTokens as dt } from "@/shared/design-system/north-star/tokens";

type CustomerDetailActionBarProps = {
  customerId: string;
  invoices: Invoice[];
  canCreateJob: boolean;
  canManageBilling: boolean;
  northStar?: boolean;
  compact?: boolean;
};

const actionClass =
  "inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50";

function resolveRecordPaymentHref(invoices: Invoice[]): string | null {
  const unpaidInvoice = invoices.find(
    (invoice) =>
      hasInvoiceUnpaidBalance(invoice) &&
      invoice.status !== "void" &&
      invoice.status !== "cancelled",
  );

  return unpaidInvoice ? `/invoices/${unpaidInvoice.id}` : null;
}

export function CustomerDetailActionBar({
  customerId,
  invoices,
  canCreateJob,
  canManageBilling,
  northStar = false,
  compact = false,
}: CustomerDetailActionBarProps) {
  const recordPaymentHref = resolveRecordPaymentHref(invoices);
  const primaryClass = northStar ? dt.primaryAction : actionClass;
  const secondaryClass = northStar ? dt.secondaryAction : actionClass;

  if (!canCreateJob && !canManageBilling) {
    return null;
  }

  return (
    <div className={compact ? "flex flex-wrap gap-1.5" : "flex flex-wrap gap-2"}>
      {canCreateJob ? (
        <Link href={createJobForCustomerHref(customerId)} className={primaryClass}>
          <Plus className="h-3.5 w-3.5" />
          New job
        </Link>
      ) : null}
      {canManageBilling ? (
        <>
          <Link
            href={createEstimateForCustomerHref(customerId)}
            className={secondaryClass}
          >
            <FileText className="h-3.5 w-3.5" />
            New estimate
          </Link>
          <Link
            href={createInvoiceForCustomerHref(customerId)}
            className={secondaryClass}
          >
            <Receipt className="h-3.5 w-3.5" />
            New invoice
          </Link>
          {recordPaymentHref ? (
            <Link href={recordPaymentHref} className={secondaryClass}>
              <DollarSign className="h-3.5 w-3.5" />
              Record payment
            </Link>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
