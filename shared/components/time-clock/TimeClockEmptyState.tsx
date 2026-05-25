import { Clock, SearchX } from "lucide-react";

type TimeClockEmptyStateProps = {
  variant: "no-entries" | "no-results";
  onCreateEntry?: () => void;
};

export function TimeClockEmptyState({
  variant,
  onCreateEntry,
}: TimeClockEmptyStateProps) {
  const isNoResults = variant === "no-results";

  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
        {isNoResults ? (
          <SearchX className="h-7 w-7 text-slate-400" />
        ) : (
          <Clock className="h-7 w-7 text-slate-400" />
        )}
      </div>

      <h3 className="mt-5 text-lg font-bold text-slate-900">
        {isNoResults ? "No time entries found" : "No time entries yet"}
      </h3>

      <p className="mt-2 max-w-sm text-sm text-slate-500">
        {isNoResults
          ? "Try adjusting your search or filters to find what you're looking for."
          : "Clock in from the time clock widget or manually log your first field session."}
      </p>

      {!isNoResults && onCreateEntry ? (
        <button
          type="button"
          onClick={onCreateEntry}
          className="mt-6 inline-flex items-center gap-2 rounded-lg bg-cyan-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-cyan-700"
        >
          <Clock className="h-4 w-4" />
          Log manual entry
        </button>
      ) : null}
    </div>
  );
}
