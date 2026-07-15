import {
  adminCompactSummaryMetricClass,
  adminCompactSummaryStripClass,
  adminCompactSummaryStripInnerClass,
} from "@/shared/lib/admin-density";
import { MasterContentStack } from "./MasterContentStack";
import { MasterPageSurface } from "./MasterPageSurface";
import { MasterShellPage } from "./MasterShellPage";
import {
  masterListPageScrollRegionClass,
  masterListPageSurfaceClass,
} from "./tokens";

type SkeletonProps = {
  className?: string;
};

function Skeleton({ className }: SkeletonProps) {
  return <div className={`admin-skeleton ${className ?? ""}`} />;
}

export type MasterListPageLoadingStateProps = {
  /** Optional static title (shows skeleton when omitted) */
  title?: string;
  /** Optional static subtitle (shows skeleton when omitted) */
  subtitle?: string;
  /** Number of summary metric cards to show (0 hides the strip) */
  summaryCardCount?: number;
  /** Tailwind lg grid column classes for summary cards */
  summaryLgColumnsClass?: string;
  /** Show today/all view tab skeleton row */
  showViewTabs?: boolean;
  /** Show secondary header action skeleton (e.g. Import on Customers) */
  showSecondaryAction?: boolean;
  /** Number of filter control skeletons in the toolbar row */
  filterControlCount?: number;
  /** Filter toolbar layout — `stacked` mirrors Expenses-style multi-row filters */
  filterVariant?: "inline" | "stacked";
  /** Number of table row skeletons */
  tableRowCount?: number;
  /** Alias for `tableRowCount` */
  rowCount?: number;
  /** Row layout variant for the table skeleton */
  tableRowVariant?: "default" | "customer";
};

/**
 * Loading scaffold for list pages using Master Shell primitives.
 * Mirrors `MasterListPageLayout` with `density="compact"` structure.
 */
export function MasterListPageLoadingState({
  title,
  subtitle,
  summaryCardCount = 0,
  summaryLgColumnsClass = "lg:grid-cols-4",
  showViewTabs = true,
  showSecondaryAction = false,
  filterControlCount = 2,
  filterVariant = "inline",
  tableRowCount = 8,
  rowCount,
  tableRowVariant = "default",
}: MasterListPageLoadingStateProps) {
  const resolvedRowCount = rowCount ?? tableRowCount;

  const filterToolbar =
    filterVariant === "stacked" ? (
      <div className="shrink-0 border-b border-slate-100/90 bg-white px-4 py-3">
        <div className="flex flex-col gap-3">
          <Skeleton className="h-10 w-full rounded-lg" />
          <div className="flex flex-wrap items-center gap-2">
            <Skeleton className="h-7 w-28 rounded-full" />
          </div>
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: filterControlCount }).map((_, index) => (
              <Skeleton key={index} className="h-10 w-36 rounded-lg" />
            ))}
          </div>
          <Skeleton className="h-4 w-24" />
        </div>
      </div>
    ) : (
      <div className="admin-panel-header shrink-0 p-4 sm:px-5">
        <div className="flex flex-wrap gap-3">
          <Skeleton className="h-9 w-full max-w-md" />
          {Array.from({ length: filterControlCount }).map((_, index) => (
            <Skeleton key={index} className="h-9 w-36" />
          ))}
        </div>
      </div>
    );

  return (
    <MasterShellPage fillViewport density="compact">
      <header
        className="admin-page-header flex shrink-0 items-center justify-between gap-2 px-3 py-2 sm:px-3.5"
      >
        <div className="flex min-w-0 flex-1 items-baseline gap-2">
          {title ? (
            <h1 className="sr-only shrink-0 text-base font-bold tracking-tight text-slate-900 md:not-sr-only md:text-lg">
              {title}
            </h1>
          ) : (
            <Skeleton className="hidden h-5 w-32 shrink-0 md:block md:h-6 md:w-40" />
          )}
          {subtitle ? (
            <p className="min-w-0 truncate text-xs text-slate-500">{subtitle}</p>
          ) : (
            <Skeleton className="h-3 w-48 max-w-full" />
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {showSecondaryAction ? (
            <Skeleton className="h-9 w-24 shrink-0 rounded-xl" />
          ) : null}
          <Skeleton className="h-9 w-28 shrink-0 rounded-xl" />
        </div>
      </header>

      {summaryCardCount > 0 ? (
        <>
          <div className={adminCompactSummaryStripClass} aria-hidden="true">
            <div className={adminCompactSummaryStripInnerClass}>
              {Array.from({ length: summaryCardCount }).map((_, index) => (
                <div
                  key={index}
                  className={`${adminCompactSummaryMetricClass} ${
                    index > 0 ? "border-l border-slate-200 pl-3" : ""
                  }`}
                >
                  <Skeleton className="h-3 w-10" />
                  <Skeleton className="h-4 w-8" />
                </div>
              ))}
            </div>
          </div>
          <div
            className={`hidden shrink-0 gap-2.5 sm:grid sm:grid-cols-2 ${summaryLgColumnsClass}`}
          >
            {Array.from({ length: summaryCardCount }).map((_, index) => (
              <Skeleton key={index} className="admin-metric-card h-24" />
            ))}
          </div>
        </>
      ) : null}

      <MasterContentStack density="compact" scrollable>
        <MasterPageSurface variant="card" className={masterListPageSurfaceClass}>
          {showViewTabs ? (
            <div className="shrink-0 border-b border-slate-100/90 px-3 py-1.5 sm:px-4">
              <div className="flex gap-2">
                <Skeleton className="h-9 w-24 rounded-lg" />
                <Skeleton className="h-9 w-20 rounded-lg" />
              </div>
            </div>
          ) : null}

          {filterToolbar}

          <div className={`${masterListPageScrollRegionClass} p-4`}>
            <div className="space-y-3">
              {Array.from({ length: resolvedRowCount }).map((_, index) => (
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
        </MasterPageSurface>
      </MasterContentStack>
    </MasterShellPage>
  );
}
