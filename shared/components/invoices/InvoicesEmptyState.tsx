import { Receipt, SearchX } from "lucide-react";

type InvoicesEmptyStateProps = {
  variant: "no-invoices" | "no-results";
  onCreateInvoice?: () => void;
};

export function InvoicesEmptyState({
  variant,
  onCreateInvoice,
}: InvoicesEmptyStateProps) {
  const isNoResults = variant === "no-results";

  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <div className="admin-empty-icon">
        {isNoResults ? (
          <SearchX className="h-7 w-7 text-slate-400" />
        ) : (
          <Receipt className="h-7 w-7 text-slate-400" />
        )}
      </div>

      <h3 className="mt-5 text-lg font-bold text-slate-900">
        {isNoResults ? "No invoices found" : "No invoices yet"}
      </h3>

      <p className="mt-2 max-w-sm text-sm text-slate-500">
        {isNoResults
          ? "Try adjusting your search or filters to find what you're looking for."
          : "Create your first invoice with line items, tax, and a due date."}
      </p>

      {!isNoResults && onCreateInvoice ? (
        <button
          type="button"
          onClick={onCreateInvoice}
          className="mt-6 inline-flex items-center gap-2 admin-btn-primary"
        >
          <Receipt className="h-4 w-4" />
          Create your first invoice
        </button>
      ) : null}
    </div>
  );
}
