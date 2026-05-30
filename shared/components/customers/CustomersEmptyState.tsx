import { SearchX, UserPlus, Users } from "lucide-react";

type CustomersEmptyStateProps = {
  variant: "no-customers" | "no-results";
  onCreateCustomer?: () => void;
};

export function CustomersEmptyState({
  variant,
  onCreateCustomer,
}: CustomersEmptyStateProps) {
  const isNoResults = variant === "no-results";

  return (
    <div className="admin-empty-wrap">
      <div className="admin-empty-state w-full max-w-md text-center">
        <div className="admin-empty-icon mx-auto">
          {isNoResults ? (
            <SearchX className="h-6 w-6 text-slate-400" />
          ) : (
            <Users className="h-6 w-6 text-slate-400" />
          )}
        </div>

        <h3 className="admin-heading-section mt-3 text-base">
          {isNoResults ? "No customers found" : "No customers yet"}
        </h3>

        <p className="admin-text-muted mt-1.5 text-sm">
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
            className="mt-4 inline-flex items-center gap-2 admin-btn-primary"
          >
            <UserPlus className="h-4 w-4" />
            Add your first customer
          </button>
        ) : null}
      </div>
    </div>
  );
}
