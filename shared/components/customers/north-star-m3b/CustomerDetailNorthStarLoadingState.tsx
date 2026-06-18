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
            <div className="flex items-start gap-4">
              <Skeleton dark className="h-12 w-12 shrink-0 rounded-full" />
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton dark className="h-2.5 w-24" />
                <Skeleton dark className="h-7 w-48 max-w-full" />
                <Skeleton dark className="h-4 w-56 max-w-full" />
                <Skeleton dark className="h-4 w-40 max-w-full" />
              </div>
            </div>
            <Skeleton dark className="h-20 w-full rounded-lg" />
            <div className="grid gap-3 border-t border-[rgba(201,164,77,0.14)] pt-4 sm:grid-cols-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="space-y-2">
                  <Skeleton dark className="h-2.5 w-16" />
                  <Skeleton dark className="h-6 w-20" />
                </div>
              ))}
            </div>
          </div>

          <div className={dt.commandPlate}>
            <div className="flex gap-2">
              {Array.from({ length: 5 }).map((_, index) => (
                <Skeleton key={index} className="h-8 w-16 rounded-lg" />
              ))}
            </div>
            <div className="flex flex-wrap gap-1.5">
              <Skeleton className="h-8 w-24 rounded-lg" />
              <Skeleton className="h-8 w-28 rounded-lg" />
              <Skeleton className="h-8 w-24 rounded-lg" />
            </div>
          </div>

          <div className={`hidden lg:grid ${dt.workspaceGrid}`}>
            <div className={dt.workspaceMain}>
              {Array.from({ length: 3 }).map((_, index) => (
                <Skeleton key={index} className="h-32 w-full rounded-[1rem]" />
              ))}
            </div>
            <div className={dt.workspaceSide}>
              {Array.from({ length: 3 }).map((_, index) => (
                <Skeleton key={index} className="h-28 w-full rounded-[1rem]" />
              ))}
            </div>
          </div>
        </MasterContentStack>
      </MasterPageCanvas>
    </MasterShellPage>
  );
}

export function CustomerDetailNorthStarLoadingState() {
  return (
    <>
      <div className="hidden lg:block">
        <DesktopLoadingSkeleton />
      </div>
      <div className="lg:hidden">
        <MasterDetailPageLoadingState
          showBackLink
          showProfileCard
          sectionCount={4}
        />
      </div>
    </>
  );
}
