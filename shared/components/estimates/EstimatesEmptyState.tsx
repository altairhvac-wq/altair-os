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

  const emptyDescription = needsCustomers
    ? "Estimates are linked to customers. Add a customer first, then create your first quote."
    : onCreateEstimate
      ? "Create your first estimate with line items, pricing, and a valid-until date."
      : "Estimates will appear here once your office team creates them.";

  return (
    <div className="flex flex-col items-center justify-center px-4 py-10 sm:px-6 sm:py-14">
      <div className="admin-empty-state w-full max-w-md text-center">
        <div className="admin-empty-icon mx-auto">
          {isNoResults ? (
            <SearchX className="h-7 w-7 text-slate-400" />
          ) : (
            <FileText className="h-7 w-7 text-slate-400" />
          )}
        </div>

        <h3 className="admin-heading-section mt-4 text-base">
          {isNoResults ? "No estimates found" : "No estimates yet"}
        </h3>

        <p className="admin-text-muted mt-2 text-sm">
          {isNoResults
            ? "Try adjusting your search or filters to find what you're looking for."
            : emptyDescription}
        </p>

        {!isNoResults && needsCustomers ? (
          <Link
            href="/customers"
            className="mt-6 inline-flex items-center gap-2 admin-btn-primary"
          >
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
    </div>
  );
}
