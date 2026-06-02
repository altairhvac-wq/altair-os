type SkeletonProps = {
  className?: string;
};

function Skeleton({ className }: SkeletonProps) {
  return <div className={`admin-skeleton ${className ?? ""}`} />;
}

export type ListCommandCenterLoadingStateProps = {
  /** Number of summary metric cards to show (0 hides the strip) */
  summaryCardCount?: number;
  /** Tailwind lg grid column classes for summary cards */
  summaryLgColumnsClass?: string;
  /** Show today/all view tab skeleton row */
  showViewTabs?: boolean;
  /** Number of filter control skeletons in the toolbar row */
  filterControlCount?: number;
  /** Number of table row skeletons */
  tableRowCount?: number;
  /** Row layout variant for the table skeleton */
  tableRowVariant?: "default" | "customer";
};

export function ListCommandCenterLoadingState({
  summaryCardCount = 0,
  summaryLgColumnsClass = "lg:grid-cols-4",
  showViewTabs = true,
  filterControlCount = 2,
  tableRowCount = 8,
  tableRowVariant = "default",
}: ListCommandCenterLoadingStateProps) {
  return (
    <div className="flex flex-col gap-3 lg:gap-4 lg:h-[calc(100dvh-7rem)] lg:min-h-0 lg:overflow-hidden">
      <header className="admin-page-header flex shrink-0 flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-2">
          <Skeleton className="h-8 w-48 sm:h-9 sm:w-56" />
          <Skeleton className="h-4 w-64 max-w-full sm:w-80" />
        </div>
        <Skeleton className="h-10 w-36 shrink-0 rounded-xl" />
      </header>

      {summaryCardCount > 0 ? (
        <>
          <Skeleton className="h-10 shrink-0 rounded-lg sm:hidden" />
          <div
            className={`hidden shrink-0 gap-2.5 sm:grid sm:grid-cols-2 ${summaryLgColumnsClass}`}
          >
            {Array.from({ length: summaryCardCount }).map((_, index) => (
              <Skeleton key={index} className="admin-metric-card h-24" />
            ))}
          </div>
        </>
      ) : null}

      <section className="flex min-h-[16rem] min-w-0 lg:flex-1 flex-col overflow-hidden admin-card lg:min-h-0">
        {showViewTabs ? (
          <div className="shrink-0 border-b border-slate-100/90 px-4 py-2.5">
            <div className="flex gap-2">
              <Skeleton className="h-9 w-24 rounded-lg" />
              <Skeleton className="h-9 w-20 rounded-lg" />
            </div>
          </div>
        ) : null}

        <div className="admin-panel-header shrink-0 p-4 sm:px-5">
          <div className="flex flex-wrap gap-3">
            <Skeleton className="h-9 w-full max-w-md" />
            {Array.from({ length: filterControlCount }).map((_, index) => (
              <Skeleton key={index} className="h-9 w-36" />
            ))}
          </div>
        </div>

        <div className="min-h-0 min-w-0 flex-1 overflow-x-hidden lg:overflow-y-auto p-4">
          <div className="space-y-3">
            {Array.from({ length: tableRowCount }).map((_, index) => (
              <div key={index} className="flex items-center gap-4 px-2 py-3">
                {tableRowVariant === "customer" ? (
                  <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
                ) : (
                  <Skeleton className="h-4 w-20" />
                )}
                <div className="min-w-0 flex-1 space-y-2">
                  <Skeleton className="h-4 w-36" />
                  <Skeleton className="h-3 w-48" />
                </div>
                {tableRowVariant === "customer" ? (
                  <>
                    <Skeleton className="h-6 w-16 rounded-full" />
                    <Skeleton className="h-4 w-20" />
                  </>
                ) : (
                  <>
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-6 w-20 rounded-full" />
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
