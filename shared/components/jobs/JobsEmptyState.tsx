import { Calendar, SearchX, Wrench } from "lucide-react";

type JobsEmptyStateProps = {
  variant:
    | "no-jobs"
    | "no-results"
    | "no-jobs-today"
    | "no-customer-search-results"
    | "no-company-customers";
  onCreateJob?: () => void;
};

export function JobsEmptyState({ variant, onCreateJob }: JobsEmptyStateProps) {
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
    ? "Jobs are linked to customers. Add one from Customers, then come back to schedule your first job."
    : isNoCustomerSearchResults
      ? "Try a different name, phone number, or company."
      : isNoResults
        ? "Try adjusting your filters to find what you're looking for."
        : isNoJobsToday
          ? "Today's schedule is clear. Create a job or check All Jobs for upcoming work."
          : "Create your first job to schedule work, assign technicians, and track status.";

  const Icon = icon;

  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <div className="admin-empty-icon">
        <Icon className="h-7 w-7 text-slate-400" />
      </div>

      <h3 className="mt-5 text-lg font-bold text-slate-900">{title}</h3>

      <p className="mt-2 max-w-sm text-sm text-slate-500">{description}</p>

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
  );
}
