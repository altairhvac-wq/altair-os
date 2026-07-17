import { Radio, SearchX, Wrench } from "lucide-react";
import Link from "next/link";
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
  const title =
    variant === "no-jobs" ? "Nothing to dispatch yet" : "No jobs on board";
  const description =
    variant === "no-jobs"
      ? canDispatchJobs
        ? "Schedule a job first — today's work will land here for assignment."
        : "Scheduled jobs for today will appear here when your team assigns work."
      : "Try adjusting your search or filters to find matching dispatch jobs.";

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

          <h3 className={dt.emptyStateTitle}>{title}</h3>

          <p className={dt.emptyStateDescription}>{description}</p>

          {variant === "no-jobs" && canDispatchJobs ? (
            <Link
              href="/jobs"
              className="mt-5 inline-flex items-center justify-center gap-2 rounded-lg bg-[#C9A44D] px-4 py-2.5 text-sm font-semibold text-[#17130E] transition hover:bg-[#D4B05A]"
            >
              <Wrench className="h-4 w-4" aria-hidden="true" />
              Schedule a job
            </Link>
          ) : null}
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

        <h3 className="admin-heading-section mt-3 text-base">{title}</h3>

        <p className="admin-text-muted mt-1.5 text-sm">{description}</p>

        {variant === "no-jobs" && canDispatchJobs ? (
          <Link
            href="/jobs"
            className="mt-4 inline-flex items-center gap-2 admin-btn-primary"
          >
            <Wrench className="h-4 w-4" aria-hidden="true" />
            Schedule a job
          </Link>
        ) : null}
      </div>
    </div>
  );
}
