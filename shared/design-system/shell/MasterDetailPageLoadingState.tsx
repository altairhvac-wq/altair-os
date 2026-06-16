import { MasterContentStack } from "./MasterContentStack";
import { MasterPageCanvas } from "./MasterPageCanvas";
import { MasterShellPage } from "./MasterShellPage";

type SkeletonProps = {
  className?: string;
};

function Skeleton({ className }: SkeletonProps) {
  return <div className={`admin-skeleton ${className ?? ""}`} />;
}

export type MasterDetailPageLoadingStateProps = {
  /** Show back-link skeleton above the profile card */
  showBackLink?: boolean;
  /** Show hero / profile card skeleton */
  showProfileCard?: boolean;
  /** Number of full-width section card skeletons below the profile area */
  sectionCount?: number;
  /** Show a two-column grid block (e.g. summary metrics) after the profile card */
  showSummaryGrid?: boolean;
};

/**
 * Loading scaffold for detail pages using Master Shell primitives.
 * Mirrors `MasterDetailPageLayout` structure.
 */
export function MasterDetailPageLoadingState({
  showBackLink = true,
  showProfileCard = true,
  sectionCount = 4,
  showSummaryGrid = false,
}: MasterDetailPageLoadingStateProps) {
  return (
    <MasterShellPage density="default">
      <MasterPageCanvas width="detail">
        <MasterContentStack density="default">
          {showBackLink ? <Skeleton className="h-5 w-36" /> : null}

          {showProfileCard ? <Skeleton className="h-48 w-full rounded-2xl" /> : null}

          {showSummaryGrid ? (
            <div className="grid gap-6 lg:grid-cols-2">
              <Skeleton className="h-32 w-full rounded-2xl" />
              <Skeleton className="h-32 w-full rounded-2xl" />
            </div>
          ) : null}

          {sectionCount > 0 ? (
            <>
              <Skeleton className="h-28 w-full rounded-2xl" />
              <div className="grid gap-4 sm:grid-cols-2">
                {Array.from({ length: sectionCount }).map((_, index) => (
                  <Skeleton key={index} className="h-36 w-full rounded-2xl" />
                ))}
              </div>
            </>
          ) : null}
        </MasterContentStack>
      </MasterPageCanvas>
    </MasterShellPage>
  );
}
