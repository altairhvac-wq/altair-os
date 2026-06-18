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
            <Skeleton dark className="h-5 w-32 shrink-0 sm:h-6 sm:w-40" />
            <Skeleton dark className="h-3 w-48 max-w-full" />
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Skeleton className="h-9 w-24 shrink-0 rounded-lg border border-[rgba(138,99,36,0.18)]" />
          <Skeleton className="h-9 w-28 shrink-0 rounded-lg border border-[rgba(201,164,77,0.22)]" />
        </div>
      </header>

      <MasterContentStack density="compact" scrollable>
        <MasterPageSurface
          variant="northStarList"
          className={`${masterListPageSurfaceClass} ${lt.listSurface}`}
        >
          <div aria-hidden="true" className={lt.listSurfaceTopAccent} />

          <div className={`${lt.filterBar} shrink-0`}>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <Skeleton className="h-9 w-full max-w-md rounded-lg" />
              <Skeleton className="h-9 w-36 rounded-lg" />
              <Skeleton className="h-9 w-36 rounded-lg" />
            </div>
          </div>

          <div className={`${masterListPageScrollRegionClass} p-4`}>
            <div className="space-y-3">
              {Array.from({ length: 8 }).map((_, index) => (
                <div key={index} className="flex items-center gap-4 px-2 py-3">
                  <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
                  <div className="min-w-0 flex-1 space-y-2">
                    <Skeleton className="h-4 w-36" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                  <Skeleton className="h-6 w-16 rounded-full" />
                  <Skeleton className="h-4 w-20" />
                </div>
              ))}
            </div>
          </div>
        </MasterPageSurface>
      </MasterContentStack>
    </MasterShellPage>
  );
}

export function CustomersNorthStarLoadingState() {
  return (
    <>
      <div className="hidden lg:block">
        <DesktopLoadingSkeleton />
      </div>
      <div className="lg:hidden">
        <MasterListPageLoadingState
          showViewTabs={false}
          showSecondaryAction
          filterControlCount={2}
          tableRowVariant="customer"
        />
      </div>
    </>
  );
}
