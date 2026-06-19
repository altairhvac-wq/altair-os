import { Radio, SearchX } from "lucide-react";
import { northStarDispatchTokens as dt } from "@/shared/design-system/north-star/tokens";

type DispatchEmptyStateProps = {
  variant: "no-results" | "no-jobs";
  canDispatchJobs?: boolean;
  northStar?: boolean;
};

export function DispatchEmptyState({
  variant,
  canDispatchJobs = false,
  northStar = false,
}: DispatchEmptyStateProps) {
  if (northStar) {
    return (
      <div className="flex min-h-[10rem] items-center justify-center py-6 sm:min-h-[12rem] sm:py-8">
        <div className={dt.emptyState}>
          <div className={dt.emptyStateIcon}>
            {variant === "no-results" ? (
              <SearchX className="h-6 w-6" />
            ) : (
              <Radio className="h-6 w-6" />
            )}
          </div>

          <h3 className={dt.emptyStateTitle}>
            {variant === "no-jobs" ? "No jobs scheduled today" : "No jobs on board"}
          </h3>

          <p className={dt.emptyStateDescription}>
            {variant === "no-jobs"
              ? canDispatchJobs
                ? "Scheduled jobs for today will appear on the dispatch board. Create jobs from the Jobs page to get started."
                : "Scheduled jobs for today will appear here when your team assigns work."
              : "Try adjusting your search or filters to find dispatch jobs matching your criteria."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-empty-wrap">
      <div className="admin-empty-state w-full max-w-md text-center">
        <div className="admin-empty-icon mx-auto">
          {variant === "no-results" ? (
            <SearchX className="h-6 w-6 text-slate-400" />
          ) : (
            <Radio className="h-6 w-6 text-slate-400" />
          )}
        </div>

        <h3 className="admin-heading-section mt-3 text-base">
          {variant === "no-jobs" ? "No jobs scheduled today" : "No jobs on board"}
        </h3>

        <p className="admin-text-muted mt-1.5 text-sm">
          {variant === "no-jobs"
            ? canDispatchJobs
              ? "Scheduled jobs for today will appear on the dispatch board. Create jobs from the Jobs page to get started."
              : "Scheduled jobs for today will appear here when your team assigns work."
            : "Try adjusting your search or filters to find dispatch jobs matching your criteria."}
        </p>
      </div>
    </div>
  );
}
