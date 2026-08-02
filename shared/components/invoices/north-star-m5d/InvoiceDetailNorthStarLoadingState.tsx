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
          <div className={`flex flex-col ${altairMcGridGapClass}`}>
            <section className="space-y-2">
              <Skeleton className="h-3 w-20" />
              <div className={`${altairMcCardClass} ${altairMcCardPadClass}`}>
                <div className="flex flex-wrap items-start justify-between gap-2.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <Skeleton className="h-7 w-40 max-w-full" />
                    <Skeleton className="h-6 w-20 rounded-full" />
                  </div>
                  <div className="hidden sm:flex flex-wrap gap-1.5">
                    <Skeleton className="h-8 w-24 rounded-lg" />
                    <Skeleton className="h-8 w-28 rounded-lg" />
                  </div>
                </div>
              </div>
            </section>

            <div
              className={`flex flex-col ${altairMcGridGapClass} lg:grid lg:grid-cols-[minmax(0,1.55fr)_minmax(20rem,0.95fr)] lg:items-start`}
            >
              <aside
                className={`order-1 flex min-w-0 flex-col ${altairMcGridGapClass} lg:order-2`}
              >
                {Array.from({ length: 3 }).map((_, index) => (
                  <div key={index} className="space-y-2">
                    <Skeleton className="h-3 w-24" />
                    <Skeleton className={`h-28 w-full ${altairMcCardClass}`} />
                  </div>
                ))}
              </aside>
              <div
                className={`order-2 flex min-w-0 flex-col ${altairMcGridGapClass} lg:order-1`}
              >
                <Skeleton className={`h-[28rem] w-full ${altairMcCardClass}`} />
                <div className="space-y-2">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className={`h-40 w-full ${altairMcCardClass}`} />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className={`h-36 w-full ${altairMcCardClass}`} />
                </div>
              </div>
            </div>
          </div>
        </MasterContentStack>
      </MasterPageCanvas>
    </MasterShellPage>
  );
}

export function InvoiceDetailNorthStarLoadingState() {
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
