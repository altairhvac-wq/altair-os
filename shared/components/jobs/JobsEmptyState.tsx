import { Calendar, SearchX, UserPlus, Wrench } from "lucide-react";
import Link from "next/link";
import { northStarListTokens as lt } from "@/shared/design-system/north-star/tokens";
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
  northStar?: boolean;
};

export function JobsEmptyState({
  variant,
  onCreateJob,
  canAddCustomer = false,
  northStar = false,
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

  if (northStar) {
    return (
      <div className={adminEmptyWrapClass}>
        <div className={`${lt.emptyState} w-full max-w-md text-center`}>
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#F5F1E8] text-[#6B6255] ring-1 ring-[rgba(79,70,56,0.10)]">
            <Icon className="h-6 w-6" />
          </div>

          <h3 className="mt-4 text-base font-semibold text-[#17130E]">{title}</h3>

          <p className="mt-2 text-sm text-[#6B6255]">{description}</p>

          {isNoCompanyCustomers && canAddCustomer ? (
            <Link href="/customers" className={`mt-5 ${lt.emptyStateAction}`}>
              <UserPlus className="h-4 w-4" />
              Go to Customers
            </Link>
          ) : null}

          {(variant === "no-jobs" || variant === "no-jobs-today") && onCreateJob ? (
            <button
              type="button"
              onClick={onCreateJob}
              className={`mt-5 inline-flex items-center justify-center gap-2 ${lt.emptyStateAction}`}
            >
              <Wrench className="h-4 w-4" />
              {variant === "no-jobs-today" ? "New Job" : "Create your first job"}
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

        {isNoCompanyCustomers && canAddCustomer ? (
          <Link
            href="/customers"
            className="mt-4 inline-flex items-center gap-2 admin-btn-primary"
          >
            <UserPlus className="h-4 w-4" />
            Go to Customers
          </Link>
        ) : null}

        {(variant === "no-jobs" || variant === "no-jobs-today") && onCreateJob ? (
          <button
            type="button"
            onClick={onCreateJob}
            className="mt-4 inline-flex items-center gap-2 admin-btn-primary"
          >
            <Wrench className="h-4 w-4" />
            {variant === "no-jobs-today" ? "New Job" : "Create your first job"}
          </button>
        ) : null}
      </div>
    </div>
  );
}
