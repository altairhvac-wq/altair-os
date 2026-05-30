import { BarChart3, SearchX } from "lucide-react";

type AnalyticsEmptyStateProps = {
  variant: "no-data" | "no-results";
};

export function AnalyticsEmptyState({ variant }: AnalyticsEmptyStateProps) {
  const isNoResults = variant === "no-results";

  return (
    <div className="admin-empty-wrap">
      <div className="admin-empty-state w-full max-w-md text-center">
        <div className="admin-empty-icon mx-auto">
          {isNoResults ? (
            <SearchX className="h-6 w-6 text-slate-400" />
          ) : (
            <BarChart3 className="h-6 w-6 text-slate-400" />
          )}
        </div>

        <h3 className="admin-heading-section mt-3 text-base">
          {isNoResults ? "No analytics for this range" : "Analytics not available"}
        </h3>

        <p className="admin-text-muted mt-1.5 text-sm">
          {isNoResults
            ? "Try selecting a broader date range to view revenue, job, and field performance insights."
            : "Once your team starts completing jobs and sending invoices, owner insights will appear here."}
        </p>
      </div>
    </div>
  );
}
