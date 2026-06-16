import { SearchX, Users } from "lucide-react";
import { EmptyState } from "@/shared/design-system/components/EmptyState";
import { adminEmptyWrapClass } from "@/shared/lib/admin-density";

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
