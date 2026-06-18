import { SearchX, Users } from "lucide-react";
import { EmptyState } from "@/shared/design-system/components/EmptyState";
import { northStarListTokens as lt } from "@/shared/design-system/north-star/tokens";
import { adminEmptyWrapClass } from "@/shared/lib/admin-density";

type CustomersEmptyStateProps = {
  variant: "no-customers" | "no-results";
  onCreateCustomer?: () => void;
  northStar?: boolean;
};

export function CustomersEmptyState({
  variant,
  onCreateCustomer,
  northStar = false,
}: CustomersEmptyStateProps) {
  const isNoResults = variant === "no-results";

  if (northStar) {
    return (
      <div className={adminEmptyWrapClass}>
        <div className={`${lt.emptyState} w-full max-w-md text-center`}>
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#F5F1E8] text-[#6B6255] ring-1 ring-[rgba(79,70,56,0.10)]">
            {isNoResults ? (
              <SearchX className="h-6 w-6" />
            ) : (
              <Users className="h-6 w-6" />
            )}
          </div>
          <h3 className="mt-4 text-base font-semibold text-[#17130E]">
            {isNoResults ? "No customers found" : "No customers yet"}
          </h3>
          <p className="mt-2 text-sm text-[#6B6255]">
            {isNoResults
              ? "Try adjusting your search or filter to find what you're looking for."
              : onCreateCustomer
                ? "Add your first customer to start scheduling jobs, estimates, and service history."
                : "Customers will appear here once someone on your team adds them."}
          </p>
          {!isNoResults && onCreateCustomer ? (
            <button
              type="button"
              onClick={onCreateCustomer}
              className={`mt-5 ${lt.emptyStateAction}`}
            >
              Add your first customer
            </button>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className={adminEmptyWrapClass}>
      <EmptyState
        tone={isNoResults ? "neutral" : "info"}
        icon={
          isNoResults ? (
            <SearchX className="h-6 w-6" />
          ) : (
            <Users className="h-6 w-6" />
          )
        }
        title={isNoResults ? "No customers found" : "No customers yet"}
        description={
          isNoResults
            ? "Try adjusting your search or filter to find what you're looking for."
            : onCreateCustomer
              ? "Add your first customer to start scheduling jobs, estimates, and service history."
              : "Customers will appear here once someone on your team adds them."
        }
        action={
          !isNoResults && onCreateCustomer
            ? {
                label: "Add your first customer",
                onClick: onCreateCustomer,
              }
            : undefined
        }
        className="w-full max-w-md"
      />
    </div>
  );
}
