import { FileText, SearchX } from "lucide-react";
import Link from "next/link";

type EstimatesEmptyStateProps = {
  variant: "no-estimates" | "no-results";
  onCreateEstimate?: () => void;
  needsCustomers?: boolean;
};

export function EstimatesEmptyState({
  variant,
  onCreateEstimate,
  needsCustomers = false,
}: EstimatesEmptyStateProps) {
  const isNoResults = variant === "no-results";

  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <div className="admin-empty-icon">
        {isNoResults ? (
          <SearchX className="h-7 w-7 text-slate-400" />
        ) : (
          <FileText className="h-7 w-7 text-slate-400" />
        )}
      </div>

      <h3 className="mt-5 text-lg font-bold text-slate-900">
        {isNoResults ? "No estimates found" : "No estimates yet"}
      </h3>

      <p className="mt-2 max-w-sm text-sm text-slate-500">
        {isNoResults
          ? "Try adjusting your search or filters to find what you're looking for."
          : needsCustomers
            ? "Estimates are linked to customers. Add a customer first, then create your first quote."
            : "Create your first estimate with line items, pricing, and a valid-until date."}
      </p>

      {!isNoResults && needsCustomers ? (
        <Link href="/customers" className="mt-6 inline-flex items-center gap-2 admin-btn-primary">
          <FileText className="h-4 w-4" />
          Go to Customers
        </Link>
      ) : null}

      {!isNoResults && !needsCustomers && onCreateEstimate ? (
        <button
          type="button"
          onClick={onCreateEstimate}
          className="mt-6 inline-flex items-center gap-2 admin-btn-primary"
        >
          <FileText className="h-4 w-4" />
          Create your first estimate
        </button>
      ) : null}
    </div>
  );
}
