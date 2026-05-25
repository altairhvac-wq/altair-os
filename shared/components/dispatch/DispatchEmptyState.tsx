import { Radio, SearchX } from "lucide-react";

type DispatchEmptyStateProps = {
  variant: "no-results" | "no-jobs";
};

export function DispatchEmptyState({ variant }: DispatchEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-16 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
        {variant === "no-results" ? (
          <SearchX className="h-7 w-7 text-slate-400" />
        ) : (
          <Radio className="h-7 w-7 text-slate-400" />
        )}
      </div>

      <h3 className="mt-5 text-lg font-bold text-slate-900">
        {variant === "no-jobs" ? "No jobs scheduled today" : "No jobs on board"}
      </h3>

      <p className="mt-2 max-w-sm text-sm text-slate-500">
        {variant === "no-jobs"
          ? "Scheduled jobs for today will appear on the dispatch board. Create jobs from the Jobs page to get started."
          : "Try adjusting your search or filters to find dispatch jobs matching your criteria."}
      </p>
    </div>
  );
}
