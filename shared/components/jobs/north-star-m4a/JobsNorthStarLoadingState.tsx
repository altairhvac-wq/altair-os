import {
  MasterContentStack,
  MasterListPageLoadingState,
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

function DesktopLoadingSkeleton() {
  return (
    <MasterShellPage fillViewport density="compact" className={lt.pageCanvas}>
      <header
        className={`north-star-page-header flex shrink-0 items-start justify-between gap-2 sm:items-center ${lt.pageHeader}`}
      >
        <div className="min-w-0 flex-1 space-y-1">
          <Skeleton dark className="h-2.5 w-28" />
          <div className="flex min-w-0 flex-col gap-0.5 sm:flex-row sm:items-baseline sm:gap-2">
            <Skeleton dark className="h-5 w-24 shrink-0 sm:h-6 sm:w-32" />
            <Skeleton dark className="h-3 w-40 max-w-full" />
          </div>
        </div>
        <Skeleton className="h-9 w-28 shrink-0 rounded-lg border border-[rgba(201,164,77,0.22)]" />
      </header>

      <MasterContentStack density="compact" scrollable>
        <MasterPageSurface
          variant="northStarList"
          className={`${masterListPageSurfaceClass} ${lt.listSurface}`}
        >
          <div aria-hidden="true" className={lt.listSurfaceTopAccent} />

          <div className={`${lt.viewTabsBand} shrink-0`}>
            <div className={`${lt.viewTabsControl} max-w-xs`}>
              <Skeleton className="h-8 flex-1 rounded-md" />
              <Skeleton className="h-8 flex-1 rounded-md" />
            </div>
          </div>

          <div className={`${lt.filterBar} shrink-0`}>
            <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
              <Skeleton className="h-9 w-full max-w-xl rounded-lg" />
              <Skeleton className="h-9 w-36 rounded-lg" />
              <Skeleton className="h-9 w-36 rounded-lg" />
              <Skeleton className="h-9 w-36 rounded-lg" />
            </div>
          </div>

          <div className={`${masterListPageScrollRegionClass} p-4`}>
            <div className="space-y-3">
              {Array.from({ length: 8 }).map((_, index) => (
                <div key={index} className="flex items-center gap-4 px-2 py-3">
                  <Skeleton className="h-4 w-4 shrink-0 rounded" />
                  <div className="min-w-0 flex-1 space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-40" />
                  </div>
                  <Skeleton className="h-6 w-16 rounded-full" />
                  <Skeleton className="h-6 w-14 rounded-full" />
                  <Skeleton className="h-4 w-28" />
                </div>
              ))}
            </div>
          </div>
        </MasterPageSurface>
      </MasterContentStack>
    </MasterShellPage>
  );
}

export function JobsNorthStarLoadingState() {
  return (
    <>
      <div className="hidden lg:block">
        <DesktopLoadingSkeleton />
      </div>
      <div className="lg:hidden">
        <MasterListPageLoadingState filterControlCount={3} />
      </div>
    </>
  );
}
