import { BarChart3, SearchX } from "lucide-react";

type AnalyticsEmptyStateProps = {
  variant: "no-data" | "no-results";
};

export function AnalyticsEmptyState({ variant }: AnalyticsEmptyStateProps) {
  const isNoResults = variant === "no-results";

  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-20 text-center shadow-sm">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100">
        {isNoResults ? (
          <SearchX className="h-8 w-8 text-slate-400" />
        ) : (
          <BarChart3 className="h-8 w-8 text-slate-400" />
        )}
      </div>

      <h3 className="mt-6 text-xl font-bold text-slate-900">
        {isNoResults ? "No analytics for this range" : "Analytics not available"}
      </h3>

      <p className="mt-2 max-w-md text-sm leading-relaxed text-slate-500">
        {isNoResults
          ? "Try selecting a broader date range to view revenue, job, and field performance insights."
          : "Once your team starts completing jobs and sending invoices, owner insights will appear here."}
      </p>
    </div>
  );
}
