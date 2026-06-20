import {
  MasterContentStack,
  MasterPageHeader,
  MasterPageSurface,
  MasterShellPage,
  masterListPageScrollRegionClass,
  masterListPageSurfaceClass,
} from "@/shared/design-system/shell";
import { northStarListTokens as lt } from "@/shared/design-system/north-star/tokens";

function Skeleton({
  className,
  dark = false,
}: {
  className?: string;
  dark?: boolean;
}) {
  return (
    <div
      className={`north-star-skeleton ${dark ? "north-star-skeleton-dark" : ""} ${className ?? ""}`}
    />
  );
}

export function TimeNorthStarLoadingState() {
  return (
    <MasterShellPage density="compact" className={lt.pageCanvas}>
      <MasterPageHeader
        title="Labor & Payroll"
        subtitle="Review time entries, approve labor, and prepare payroll."
        density="compact"
        surfaceVariant="northStar"
        className={`north-star-time-page-header ${lt.pageHeader}`}
        titleClassName={lt.pageHeaderTitle}
        subtitleClassName={lt.pageHeaderSubtitle}
      />

      <MasterContentStack
        density="compact"
        className="time-north-star-brief min-w-0 space-y-3 px-3 sm:space-y-3.5 sm:px-3.5 lg:px-5"
      >
        <MasterPageSurface
          variant="northStarList"
          className={`${masterListPageSurfaceClass} ${lt.listSurface} overflow-hidden rounded-[1.25rem]`}
        >
          <div aria-hidden="true" className={lt.listSurfaceTopAccent} />

          <div className="flex min-h-0 min-w-0 flex-1 flex-col">
            <div className={`${lt.viewTabsBand} shrink-0`}>
              <div
                className={`${lt.viewTabsControl} grid grid-cols-4 overflow-hidden sm:flex sm:w-auto`}
              >
                {Array.from({ length: 4 }).map((_, index) => (
                  <Skeleton
                    key={index}
                    className="h-8 rounded-md sm:h-9 sm:w-28"
                  />
                ))}
              </div>
            </div>

            <div className={`time-north-star-filter-bar ${lt.filterBar} shrink-0`}>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <Skeleton className="h-9 w-full max-w-xl rounded-lg" />
                <Skeleton className="h-9 w-36 rounded-lg" />
              </div>
            </div>

            <div className={`${masterListPageScrollRegionClass} space-y-2.5 px-3 py-3 md:hidden sm:px-4 sm:py-4`}>
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton
                  key={index}
                  className="h-28 rounded-xl border border-[rgba(138,99,36,0.12)]"
                />
              ))}
            </div>

            <div className="time-north-star-ledger hidden space-y-0 px-4 py-3 md:block lg:px-5">
              {Array.from({ length: 6 }).map((_, index) => (
                <div
                  key={index}
                  className="flex items-center gap-4 border-b border-[rgba(138,99,36,0.10)] py-3.5 last:border-b-0"
                >
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-14" />
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-6 w-14 rounded-full" />
                </div>
              ))}
            </div>
          </div>
        </MasterPageSurface>
      </MasterContentStack>
    </MasterShellPage>
  );
}
