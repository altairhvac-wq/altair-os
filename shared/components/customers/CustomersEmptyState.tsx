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
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <div className="admin-empty-icon">
        {isNoResults ? (
          <SearchX className="h-7 w-7 text-slate-400" />
        ) : (
          <Users className="h-7 w-7 text-slate-400" />
        )}
      </div>

      <h3 className="mt-5 text-lg font-bold text-slate-900">
        {isNoResults ? "No customers found" : "No customers yet"}
      </h3>

      <p className="mt-2 max-w-sm text-sm text-slate-500">
        {isNoResults
          ? "Try adjusting your search or filter to find what you're looking for."
          : "Get started by adding your first customer to track jobs, estimates, and service history."}
      </p>

      {!isNoResults && onCreateCustomer ? (
        <button
          type="button"
          onClick={onCreateCustomer}
          className="mt-6 inline-flex items-center gap-2 admin-btn-primary"
        >
          <UserPlus className="h-4 w-4" />
          Add your first customer
        </button>
      ) : null}
    </div>
  );
}
