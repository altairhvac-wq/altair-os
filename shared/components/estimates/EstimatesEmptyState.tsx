import { FileText, SearchX } from "lucide-react";
import Link from "next/link";
import { northStarListTokens as lt } from "@/shared/design-system/north-star/tokens";
import { adminEmptyWrapClass } from "@/shared/lib/admin-density";

type EstimatesEmptyStateProps = {
  variant: "no-estimates" | "no-results" | "no-today";
  onCreateEstimate?: () => void;
  needsCustomers?: boolean;
  northStar?: boolean;
};

export function EstimatesEmptyState({
  variant,
  onCreateEstimate,
  needsCustomers = false,
  northStar = false,
}: EstimatesEmptyStateProps) {
  const isNoResults = variant === "no-results";
  const isNoToday = variant === "no-today";

  const emptyDescription = needsCustomers
    ? "Estimates are linked to customers. Add a customer first, then create your first quote."
    : onCreateEstimate
      ? "Create your first estimate with line items, pricing, and a valid-until date."
      : "Estimates will appear here once your office team creates them.";

  const title = isNoResults
    ? "No estimates found"
    : isNoToday
      ? "No estimates need attention today."
      : "No estimates yet";

  const description = isNoResults
    ? "Try adjusting your search or filters to find what you're looking for."
    : isNoToday
      ? "Check All for the full estimate list."
      : emptyDescription;

  const Icon = isNoResults ? SearchX : FileText;

  if (northStar) {
    return (
      <div className={adminEmptyWrapClass}>
        <div className={`${lt.emptyState} w-full max-w-md text-center`}>
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#F5F1E8] text-[#6B6255] ring-1 ring-[rgba(79,70,56,0.10)]">
            <Icon className="h-6 w-6" />
          </div>

          <h3 className="mt-4 text-base font-semibold text-[#17130E]">{title}</h3>

          <p className="mt-2 text-sm text-[#6B6255]">{description}</p>

          {!isNoResults && !isNoToday && needsCustomers ? (
            <Link href="/customers" className={`mt-5 ${lt.emptyStateAction}`}>
              <FileText className="h-4 w-4" />
              Go to Customers
            </Link>
          ) : null}

          {!isNoResults && !isNoToday && !needsCustomers && onCreateEstimate ? (
            <button
              type="button"
              onClick={onCreateEstimate}
              className={`mt-5 inline-flex items-center justify-center gap-2 ${lt.emptyStateAction}`}
            >
              <FileText className="h-4 w-4" />
              Create your first estimate
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
            <FileText className="h-4 w-4" />
            Go to Customers
          </Link>
        ) : null}

        {!isNoResults && !isNoToday && !needsCustomers && onCreateEstimate ? (
          <button
            type="button"
            onClick={onCreateEstimate}
            className="mt-4 inline-flex items-center gap-2 admin-btn-primary"
          >
            <FileText className="h-4 w-4" />
            Create your first estimate
          </button>
        ) : null}
      </div>
    </div>
  );
}
