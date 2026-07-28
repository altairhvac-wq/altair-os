import { Calendar, SearchX, UserPlus, Wrench } from "lucide-react";
import { Button } from "@/shared/design-system/components";
import { adminEmptyWrapClass } from "@/shared/lib/admin-density";

type JobsEmptyStateProps = {
  variant:
    | "no-jobs"
    | "no-results"
    | "no-jobs-today"
    | "no-customer-search-results"
    | "no-company-customers";
  onCreateJob?: () => void;
  canAddCustomer?: boolean;
  /** @deprecated Mission Control unifies presentation; retained for call-site compatibility. */
  northStar?: boolean;
};

/**
 * Calm Mission Control empty states — paper surface, quiet copy, sparse brass CTA.
 */
export function JobsEmptyState({
  variant,
  onCreateJob,
  canAddCustomer = false,
}: JobsEmptyStateProps) {
  const isNoResults = variant === "no-results";
  const isNoJobsToday = variant === "no-jobs-today";
  const isNoCustomerSearchResults = variant === "no-customer-search-results";
  const isNoCompanyCustomers = variant === "no-company-customers";

  const icon =
    isNoResults || isNoCustomerSearchResults
      ? SearchX
      : isNoJobsToday
        ? Calendar
        : Wrench;

  const title = isNoCompanyCustomers
    ? "Add a customer first"
    : isNoCustomerSearchResults
      ? "No matching customers"
      : isNoResults
        ? "No jobs found"
        : isNoJobsToday
          ? "No jobs scheduled for today"
          : "Let's schedule your first job";

  const description = isNoCompanyCustomers
    ? canAddCustomer
      ? "Jobs need a customer. Add one, then come back here to put work on the board."
      : "Jobs need a customer. Ask your office team to add one before scheduling."
    : isNoCustomerSearchResults
      ? "Try a different name, phone number, or company."
      : isNoResults
        ? "Try adjusting your search or filters to find the work you need."
        : isNoJobsToday
          ? "Nothing is on today's board. Create a job or check All Jobs for upcoming work."
          : onCreateJob
            ? "Put work on the board — then you can estimate, dispatch, and invoice from it."
            : "Assigned and scheduled jobs will appear here once dispatch adds work to the board.";

  const Icon = icon;

  return (
    <div className={adminEmptyWrapClass}>
      <div className="w-full max-w-md rounded-xl border border-altair-border bg-altair-paper-subtle px-5 py-6 text-center">
        <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-lg bg-altair-paper shadow-sm ring-1 ring-altair-border">
          <Icon className="h-4 w-4 text-altair-ink-on-paper-muted" />
        </div>

        <p className="mt-3 text-sm font-semibold text-altair-ink-on-paper">
          {title}
        </p>

        <p className="mt-1 text-xs leading-relaxed text-altair-ink-on-paper-secondary">
          {description}
        </p>

        {isNoCompanyCustomers && canAddCustomer ? (
          <div className="mt-4 flex justify-center">
            <Button
              href="/customers"
              size="sm"
              leadingIcon={<UserPlus className="h-3.5 w-3.5" />}
            >
              Go to Customers
            </Button>
          </div>
        ) : null}

        {(variant === "no-jobs" || variant === "no-jobs-today") && onCreateJob ? (
          <div className="mt-4 flex justify-center">
            <Button
              size="sm"
              onClick={onCreateJob}
              leadingIcon={<Wrench className="h-3.5 w-3.5" />}
            >
              {variant === "no-jobs-today" ? "New Job" : "Create your first job"}
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
