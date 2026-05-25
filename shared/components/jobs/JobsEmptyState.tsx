import { SearchX, Wrench } from "lucide-react";

type JobsEmptyStateProps = {
  variant: "no-jobs" | "no-results";
  onCreateJob?: () => void;
};

export function JobsEmptyState({ variant, onCreateJob }: JobsEmptyStateProps) {
  const isNoResults = variant === "no-results";

  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
        {isNoResults ? (
          <SearchX className="h-7 w-7 text-slate-400" />
        ) : (
          <Wrench className="h-7 w-7 text-slate-400" />
        )}
      </div>

      <h3 className="mt-5 text-lg font-bold text-slate-900">
        {isNoResults ? "No jobs found" : "No jobs yet"}
      </h3>

      <p className="mt-2 max-w-sm text-sm text-slate-500">
        {isNoResults
          ? "Try adjusting your search or filters to find what you're looking for."
          : "Create your first job to schedule work, assign technicians, and track status."}
      </p>

      {!isNoResults && onCreateJob ? (
        <button
          type="button"
          onClick={onCreateJob}
          className="mt-6 inline-flex items-center gap-2 rounded-lg bg-cyan-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-cyan-700"
        >
          <Wrench className="h-4 w-4" />
          Create your first job
        </button>
      ) : null}
    </div>
  );
}
