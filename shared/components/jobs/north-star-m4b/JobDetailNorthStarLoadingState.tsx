import {
  MasterContentStack,
  MasterDetailPageLoadingState,
  MasterPageCanvas,
  MasterShellPage,
} from "@/shared/design-system/shell";
import {
  altairMcCardClass,
  altairMcCardPadClass,
  altairMcGridGapClass,
} from "@/shared/design-system/components";

function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-md bg-altair-stone ${className ?? ""}`}
    />
  );
}

function DesktopLoadingSkeleton() {
  return (
    <MasterShellPage density="default">
      <MasterPageCanvas width="detailWide">
        <MasterContentStack density="default">
          <div className="flex items-center gap-3 rounded-lg border border-altair-border bg-[var(--surface-card)] px-2.5 py-1.5">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3.5 w-28" />
            <div className="flex flex-1 gap-1">
              {Array.from({ length: 6 }).map((_, index) => (
                <Skeleton key={index} className="h-3.5 w-3.5 rounded-full" />
              ))}
            </div>
            <Skeleton className="h-8 w-28 rounded-lg" />
          </div>

          <div className={`${altairMcCardClass} ${altairMcCardPadClass} space-y-2`}>
            <Skeleton className="h-2.5 w-10" />
            <div className="flex items-center justify-between gap-3">
              <div className="space-y-2">
                <Skeleton className="h-7 w-40 max-w-full" />
                <Skeleton className="h-4 w-36 max-w-full" />
              </div>
              <div className="flex gap-2">
                <Skeleton className="h-9 w-20 rounded-lg" />
                <Skeleton className="h-9 w-28 rounded-lg" />
              </div>
            </div>
          </div>

          <div className={`${altairMcCardClass} ${altairMcCardPadClass}`}>
            <div className="flex gap-2">
              {Array.from({ length: 6 }).map((_, index) => (
                <Skeleton key={index} className="h-8 w-16 rounded-lg" />
              ))}
            </div>
          </div>

          <div
            className={`hidden lg:grid lg:grid-cols-[minmax(0,1.55fr)_minmax(20rem,0.95fr)] ${altairMcGridGapClass}`}
          >
            <div className={`flex flex-col ${altairMcGridGapClass}`}>
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="h-32 w-full rounded-lg" />
              ))}
            </div>
            <div className={`flex flex-col ${altairMcGridGapClass}`}>
              {Array.from({ length: 3 }).map((_, index) => (
                <Skeleton key={index} className="h-28 w-full rounded-lg" />
              ))}
            </div>
          </div>
        </MasterContentStack>
      </MasterPageCanvas>
    </MasterShellPage>
  );
}

export function JobDetailNorthStarLoadingState() {
  return (
    <>
      <div className="hidden lg:block">
        <DesktopLoadingSkeleton />
      </div>
      <div className="lg:hidden">
        <MasterDetailPageLoadingState
          showBackLink
          showProfileCard
          showSummaryGrid
          sectionCount={4}
        />
      </div>
    </>
  );
}
