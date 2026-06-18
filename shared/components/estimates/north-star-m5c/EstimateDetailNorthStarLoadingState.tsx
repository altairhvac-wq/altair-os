import {
  MasterContentStack,
  MasterDetailPageLoadingState,
  MasterPageCanvas,
  MasterShellPage,
} from "@/shared/design-system/shell";
import { northStarDetailTokens as dt } from "@/shared/design-system/north-star/tokens";

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
    <MasterShellPage density="default" className={dt.pageCanvas}>
      <MasterPageCanvas width="detailWide">
        <MasterContentStack density="default">
          <Skeleton dark className="h-5 w-36" />

          <div className={`${dt.heroShell} space-y-4`}>
            <div aria-hidden="true" className={dt.heroAccentRail} />
            <div className="space-y-2">
              <Skeleton dark className="h-2.5 w-20" />
              <Skeleton dark className="h-7 w-44 max-w-full" />
              <Skeleton dark className="h-4 w-56 max-w-full" />
            </div>
            <div className="flex justify-end">
              <Skeleton dark className="h-10 w-32" />
            </div>
          </div>

          <div className={dt.commandPlate}>
            <Skeleton className="h-4 w-48 max-w-full" />
            <div className="flex flex-wrap gap-1.5">
              <Skeleton className="h-8 w-24 rounded-lg" />
              <Skeleton className="h-8 w-28 rounded-lg" />
            </div>
          </div>

          <div className={`hidden lg:grid ${dt.workspaceGrid}`}>
            <div className={dt.workspaceMain}>
              <Skeleton className="h-[28rem] w-full rounded-[1.25rem]" />
              <Skeleton className="h-40 w-full rounded-[1rem]" />
            </div>
            <div className={dt.workspaceSide}>
              {Array.from({ length: 2 }).map((_, index) => (
                <Skeleton key={index} className="h-28 w-full rounded-[1rem]" />
              ))}
            </div>
          </div>
        </MasterContentStack>
      </MasterPageCanvas>
    </MasterShellPage>
  );
}

export function EstimateDetailNorthStarLoadingState() {
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
          sectionCount={2}
        />
      </div>
    </>
  );
}
