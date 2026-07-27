import {
  MasterContentStack,
  MasterPageSurface,
  MasterShellPage,
  masterListPageScrollRegionClass,
  masterListPageSurfaceClass,
} from "@/shared/design-system/shell";
import { customerMissionClasses as cm } from "../customer-list-presentation";

function Skeleton({ className }: { className?: string }) {
  return <div className={`admin-skeleton ${className ?? ""}`} />;
}

/**
 * Mission Briefing loading scaffold for Customers — compact header,
 * search-first filter region, quiet list rows. Matches CustomersPageView.
 */
export function CustomersNorthStarLoadingState() {
  return (
    <MasterShellPage fillViewport density="compact">
      <header className="admin-page-header flex shrink-0 items-center justify-between gap-2 px-3 py-1.5 sm:px-3.5">
        <div className="flex min-w-0 flex-1 items-baseline gap-2">
          <Skeleton className="hidden h-5 w-28 shrink-0 md:block" />
          <Skeleton className="h-3 w-52 max-w-full" />
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Skeleton className="h-9 w-20 shrink-0 rounded-lg" />
          <Skeleton className="h-9 w-28 shrink-0 rounded-lg" />
        </div>
      </header>

      <MasterContentStack density="compact" scrollable>
        <MasterPageSurface
          variant="workspace"
          className={masterListPageSurfaceClass}
        >
          <div className={cm.filterRegion}>
            <div className={cm.filterSearchBand}>
              <Skeleton className="h-10 w-full max-w-xl rounded-lg" />
              <Skeleton className="mt-1.5 h-3 w-24" />
            </div>
            <div className={`${cm.filterTabsBand} pb-2.5`}>
              <div className="grid w-full grid-cols-4 gap-0.5 sm:flex sm:w-auto">
                {Array.from({ length: 4 }).map((_, index) => (
                  <Skeleton key={index} className="h-9 flex-1 rounded-md sm:w-24" />
                ))}
              </div>
            </div>
          </div>

          <div className={`${masterListPageScrollRegionClass} ${cm.listShell}`}>
            <div className="divide-y divide-altair-border/50">
              {Array.from({ length: 8 }).map((_, index) => (
                <div key={index} className="flex items-center gap-3 px-3 py-3.5">
                  <Skeleton className="h-9 w-9 shrink-0 rounded-full" />
                  <div className="min-w-0 flex-1 space-y-2">
                    <Skeleton className="h-4 w-36" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                  <Skeleton className="hidden h-5 w-16 rounded-full sm:block" />
                  <Skeleton className="h-4 w-24" />
                </div>
              ))}
            </div>
          </div>
        </MasterPageSurface>
      </MasterContentStack>
    </MasterShellPage>
  );
}
