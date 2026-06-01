import { Receipt, SearchX } from "lucide-react";
import Link from "next/link";

type InvoicesEmptyStateProps = {
  variant: "no-invoices" | "no-results" | "no-today";
  onCreateInvoice?: () => void;
  needsCustomers?: boolean;
};

export function InvoicesEmptyState({
  variant,
  onCreateInvoice,
  needsCustomers = false,
}: InvoicesEmptyStateProps) {
  const isNoResults = variant === "no-results";
  const isNoToday = variant === "no-today";

  const emptyDescription = needsCustomers
    ? "Invoices are linked to customers. Add a customer first, then create your first invoice."
    : onCreateInvoice
      ? "Create your first invoice with line items, tax, and a due date."
      : "Invoices will appear here once your office team creates them.";

  return (
    <div className="admin-empty-wrap">
      <div className="admin-empty-state w-full max-w-md text-center">
        <div className="admin-empty-icon mx-auto">
          {isNoResults ? (
            <SearchX className="h-6 w-6 text-slate-400" />
          ) : (
            <Receipt className="h-6 w-6 text-slate-400" />
          )}
        </div>

        <h3 className="admin-heading-section mt-3 text-base">
          {isNoResults
            ? "No invoices found"
            : isNoToday
              ? "No invoices need attention today."
              : "No invoices yet"}
        </h3>

        <p className="admin-text-muted mt-1.5 text-sm">
          {isNoResults
            ? "Try adjusting your search or filters to find what you're looking for."
            : isNoToday
              ? "Check All for the full invoice list."
              : emptyDescription}
        </p>

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
