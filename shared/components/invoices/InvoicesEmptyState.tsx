import { Receipt, SearchX } from "lucide-react";
import Link from "next/link";
import { northStarListTokens as lt } from "@/shared/design-system/north-star/tokens";
import { adminEmptyWrapClass } from "@/shared/lib/admin-density";

type InvoicesEmptyStateProps = {
  variant: "no-invoices" | "no-results" | "no-today";
  onCreateInvoice?: () => void;
  needsCustomers?: boolean;
  northStar?: boolean;
};

export function InvoicesEmptyState({
  variant,
  onCreateInvoice,
  needsCustomers = false,
  northStar = false,
}: InvoicesEmptyStateProps) {
  const isNoResults = variant === "no-results";
  const isNoToday = variant === "no-today";

  const emptyDescription = needsCustomers
    ? "Invoices need a customer. Add one first, then bill for the work."
    : onCreateInvoice
      ? "Bill for completed work — line items, tax, due date, then collect payment."
      : "Invoices will appear here once your office team creates them.";

  const title = isNoResults
    ? "No invoices found"
    : isNoToday
      ? "No invoices need attention today."
      : "Let's create your first invoice";

  const description = isNoResults
    ? "Try adjusting your search or filters to find what you're looking for."
    : isNoToday
      ? "Check All for the full invoice list."
      : emptyDescription;

  const Icon = isNoResults ? SearchX : Receipt;

  if (northStar) {
    return (
      <div className={adminEmptyWrapClass}>
        <div className={`${lt.emptyState} w-full max-w-md text-center`}>
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#EFE4CB] ring-1 ring-[rgba(138,99,36,0.12)]">
            <Icon className="h-6 w-6 text-[#8A6324]" />
          </div>

          <h3 className="mt-4 text-base font-semibold text-[#17130E]">{title}</h3>

          <p className="mt-2 text-sm text-[#64748B]">{description}</p>

          {!isNoResults && !isNoToday && needsCustomers ? (
            <Link href="/customers" className={`mt-5 ${lt.emptyStateAction}`}>
              <Receipt className="h-4 w-4" />
              Go to Customers
            </Link>
          ) : null}

          {!isNoResults && !isNoToday && !needsCustomers && onCreateInvoice ? (
            <button
              type="button"
              onClick={onCreateInvoice}
              className={`mt-5 inline-flex items-center justify-center gap-2 ${lt.emptyStateAction}`}
            >
              <Receipt className="h-4 w-4" />
              Create your first invoice
            </button>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="admin-empty-wrap">
      <div className="admin-empty-state w-full max-w-md text-center">
        <div className="admin-empty-icon mx-auto">
          <Icon className="h-6 w-6 text-slate-400" />
        </div>

        <h3 className="admin-heading-section mt-3 text-base">{title}</h3>

        <p className="admin-text-muted mt-1.5 text-sm">{description}</p>

        {!isNoResults && !isNoToday && needsCustomers ? (
          <Link
            href="/customers"
            className="mt-4 inline-flex items-center gap-2 admin-btn-primary"
          >
            <Receipt className="h-4 w-4" />
            Go to Customers
          </Link>
        ) : null}

        {!isNoResults && !isNoToday && !needsCustomers && onCreateInvoice ? (
          <button
            type="button"
            onClick={onCreateInvoice}
            className="mt-4 inline-flex items-center gap-2 admin-btn-primary"
          >
            <Receipt className="h-4 w-4" />
            Create your first invoice
          </button>
        ) : null}
      </div>
    </div>
  );
}
