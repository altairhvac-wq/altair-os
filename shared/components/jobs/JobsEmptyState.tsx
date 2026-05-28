import { Calendar, SearchX, UserPlus, Wrench } from "lucide-react";
import Link from "next/link";

type JobsEmptyStateProps = {
  variant:
    | "no-jobs"
    | "no-results"
    | "no-jobs-today"
    | "no-customer-search-results"
    | "no-company-customers";
  onCreateJob?: () => void;
  canAddCustomer?: boolean;
};

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
          : "No jobs yet";

  const description = isNoCompanyCustomers
    ? canAddCustomer
      ? "Jobs are linked to customers. Add your first customer, then come back here to schedule work."
      : "Jobs are linked to customers. Your office team needs to add a customer before work can be scheduled."
    : isNoCustomerSearchResults
      ? "Try a different name, phone number, or company."
      : isNoResults
        ? "Try adjusting your filters to find what you're looking for."
        : isNoJobsToday
          ? "Nothing is on today's board. Create a job or check All Jobs for upcoming work."
          : onCreateJob
            ? "Create your first job to schedule work, assign technicians, and track status."
            : "Assigned and scheduled jobs will appear here once dispatch adds work to the board.";

  const Icon = icon;

  return (
    <div className="flex flex-col items-center justify-center px-4 py-10 sm:px-6 sm:py-14">
      <div className="admin-empty-state w-full max-w-md text-center">
        <div className="admin-empty-icon mx-auto">
          <Icon className="h-7 w-7 text-slate-400" />
        </div>

        <h3 className="admin-heading-section mt-4 text-base">{title}</h3>

        <p className="admin-text-muted mt-2 text-sm">{description}</p>

        {isNoCompanyCustomers && canAddCustomer ? (
          <Link
            href="/customers"
            className="mt-6 inline-flex items-center gap-2 admin-btn-primary"
          >
            <UserPlus className="h-4 w-4" />
            Go to Customers
          </Link>
        ) : null}

        {(variant === "no-jobs" || variant === "no-jobs-today") && onCreateJob ? (
          <button
            type="button"
            onClick={onCreateJob}
            className="mt-6 inline-flex items-center gap-2 admin-btn-primary"
          >
            <Wrench className="h-4 w-4" />
            {variant === "no-jobs-today" ? "New Job" : "Create your first job"}
          </button>
        ) : null}
      </div>
    </div>
  );
}
