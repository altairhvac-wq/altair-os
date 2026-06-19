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
                <Skeleton dark className="h-2.5 w-28" />
                <Skeleton dark className="h-7 w-48 max-w-full" />
                <Skeleton dark className="h-4 w-32 max-w-full" />
                <Skeleton dark className="h-4 w-56 max-w-full" />
                <Skeleton dark className="h-4 w-40 max-w-full" />
              </div>
            </div>
          </div>

          <div className={`grid gap-2.5 ${dt.workspaceGrid}`}>
            <div className={dt.workspaceMain}>
              {Array.from({ length: 3 }).map((_, index) => (
                <Skeleton key={index} className="h-36 w-full rounded-[1rem]" />
              ))}
            </div>
            <div className={dt.workspaceSide}>
              {Array.from({ length: 3 }).map((_, index) => (
                <Skeleton key={index} className="h-32 w-full rounded-[1rem]" />
              ))}
            </div>
          </div>
        </MasterContentStack>
      </MasterPageCanvas>
    </MasterShellPage>
  );
}

export function TeamMemberProfileNorthStarLoadingState() {
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
