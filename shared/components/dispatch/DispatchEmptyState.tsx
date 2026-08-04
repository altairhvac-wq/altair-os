import { Radio, SearchX } from "lucide-react";
import { EmptyState } from "@/shared/design-system/components";

type DispatchEmptyStateProps = {
  variant: "no-results" | "no-jobs";
  canDispatchJobs?: boolean;
};

export function DispatchEmptyState({
  variant,
  canDispatchJobs = false,
}: DispatchEmptyStateProps) {
  const title =
    variant === "no-jobs" ? "Nothing to dispatch yet" : "No jobs on board";
  const description =
    variant === "no-jobs"
      ? canDispatchJobs
        ? "Schedule a job first — today's work will land here for assignment."
        : "Scheduled jobs for today will appear here when your team assigns work."
      : "Try adjusting your search or filters to find matching dispatch jobs.";

  return (
    <div className="flex min-h-[10rem] items-center justify-center py-6 sm:min-h-[12rem] sm:py-8">
      <EmptyState
        title={title}
        description={description}
        tone="neutral"
        className="border-altair-border/60 bg-white/[0.04] text-altair-paper shadow-none [&_h3]:text-altair-paper [&_p]:text-altair-ink-muted [&_.rounded-xl]:border-altair-border [&_.rounded-xl]:bg-white/[0.06] [&_.rounded-xl]:text-altair-ink-muted"
        icon={
          variant === "no-results" ? (
            <SearchX className="h-6 w-6" />
          ) : (
            <Radio className="h-6 w-6" />
          )
        }
        action={
          variant === "no-jobs" && canDispatchJobs
            ? {
                label: "Schedule a job",
                href: "/work",
              }
            : undefined
        }
      />
    </div>
  );
}
