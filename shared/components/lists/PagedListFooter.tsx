"use client";

/**
 * The "showing N of M" line and its Load more control.
 *
 * ============================== WHY THE TOTAL IS ALWAYS SHOWN ==============================
 * The defect this whole change exists to fix was invisible: a list silently
 * showed the newest 1,000 records of 5,000 and looked complete. The single most
 * valuable thing this component does is make the difference between what is on
 * screen and what exists impossible to miss — so the count is stated even when
 * everything is loaded, rather than appearing only when something is hidden.
 */

type PagedListFooterProps = {
  loadedCount: number;
  totalCount: number;
  hasMore: boolean;
  isLoadingMore: boolean;
  error: string | null;
  onLoadMore: () => void;
  /** Plural noun for the records, e.g. "customers". */
  noun: string;
};

export function PagedListFooter({
  loadedCount,
  totalCount,
  hasMore,
  isLoadingMore,
  error,
  onLoadMore,
  noun,
}: PagedListFooterProps) {
  if (totalCount === 0) {
    return null;
  }

  return (
    <div className="flex flex-col items-center gap-2 border-t border-altair-border/70 px-4 py-4">
      <p
        className="text-xs tabular-nums text-altair-ink-on-paper-secondary"
        aria-live="polite"
      >
        {hasMore
          ? `Showing ${loadedCount.toLocaleString()} of ${totalCount.toLocaleString()} ${noun}`
          : `${totalCount.toLocaleString()} ${noun}`}
      </p>

      {error ? (
        <p className="text-xs text-altair-danger" role="alert">
          {error}
        </p>
      ) : null}

      {hasMore ? (
        <button
          type="button"
          onClick={onLoadMore}
          disabled={isLoadingMore}
          className="rounded-lg border border-altair-border bg-altair-paper px-4 py-2 text-xs font-semibold text-altair-ink-on-paper transition hover:bg-altair-paper-subtle disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isLoadingMore ? "Loading…" : "Load more"}
        </button>
      ) : null}
    </div>
  );
}
