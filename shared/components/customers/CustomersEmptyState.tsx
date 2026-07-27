import { SearchX, Users } from "lucide-react";
import { Button } from "@/shared/design-system/components";
import { adminEmptyWrapClass } from "@/shared/lib/admin-density";

type CustomersEmptyStateProps = {
  variant: "no-customers" | "no-results";
  onCreateCustomer?: () => void;
  /** @deprecated Mission Briefing unifies presentation; retained for call-site compatibility. */
  northStar?: boolean;
};

/**
 * Calm Mission Briefing empty states — paper surface, quiet copy, sparse brass CTA.
 */
export function CustomersEmptyState({
  variant,
  onCreateCustomer,
}: CustomersEmptyStateProps) {
  const isNoResults = variant === "no-results";

  return (
    <div className={adminEmptyWrapClass}>
      <div className="w-full max-w-md rounded-xl border border-altair-border bg-altair-paper-subtle px-5 py-6 text-center">
        <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-lg bg-altair-paper shadow-sm ring-1 ring-altair-border">
          {isNoResults ? (
            <SearchX className="h-4 w-4 text-altair-ink-on-paper-muted" />
          ) : (
            <Users className="h-4 w-4 text-altair-ink-on-paper-muted" />
          )}
        </div>
        <p className="mt-3 text-sm font-semibold text-altair-ink-on-paper">
          {isNoResults ? "No customers found" : "Add your first customer"}
        </p>
        <p className="mt-1 text-xs leading-relaxed text-altair-ink-on-paper-secondary">
          {isNoResults
            ? "Try adjusting your search or queue to find who you need."
            : onCreateCustomer
              ? "Customers unlock jobs, estimates, and service history. Start with one real account."
              : "Customers will appear here once someone on your team adds them."}
        </p>
        {!isNoResults && onCreateCustomer ? (
          <div className="mt-4 flex justify-center">
            <Button size="sm" onClick={onCreateCustomer}>
              Add your first customer
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
