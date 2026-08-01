import {
  MasterContentStack,
  MasterPageHeader,
  MasterShellPage,
  masterListPageScrollRegionClass,
} from "@/shared/design-system/shell";
import { st } from "./network-north-star-styles";

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

const COMMUNITY_TAB_COUNT = 5;

export function NetworkNorthStarLoadingState() {
  return (
    <MasterShellPage fillViewport density="compact" className={st.pageCanvas}>
      <MasterPageHeader
        title="Community"
        subtitle="Build stronger business relationships, manage referrals, and connect with companies in your area."
        density="compact"
        surfaceVariant="northStar"
        className={`north-star-network-page-header ${st.pageHeader}`}
        titleClassName={st.pageHeaderTitle}
        subtitleClassName={st.pageHeaderSubtitle}
        primaryAction={<Skeleton dark className="h-9 w-36 rounded-lg" />}
        secondaryAction={<Skeleton dark className="h-9 w-40 rounded-lg" />}
      />

      <MasterContentStack density="compact" className={st.workspaceStack}>
        <div className={`${st.tabBodySurface} overflow-hidden`}>
          <div className={st.tabBand}>
            <div className={st.tabControl} aria-hidden="true">
              {Array.from({ length: COMMUNITY_TAB_COUNT }).map((_, index) => (
                <Skeleton
                  key={index}
                  className="h-9 min-w-0 rounded-md sm:w-28 sm:shrink-0"
                />
              ))}
            </div>
          </div>

          <div className="space-y-4 p-3 pb-4 sm:p-4 sm:pb-5 lg:px-5 lg:pb-6">
            <div className="rounded-[1.25rem] border border-[rgba(138,99,36,0.10)] bg-[#FBF7EF]/80 px-4 py-4">
              <Skeleton className="h-3 w-28" />
              <Skeleton className="mt-3 h-5 w-64 max-w-full" />
              <Skeleton className="mt-2 h-3 w-80 max-w-full" />
            </div>

            <div className={`${st.sectionSurface} space-y-3 p-4`}>
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-16 w-full rounded-xl" />
            </div>

            <div className={`${st.sectionSurface} space-y-3 p-4`}>
              <div className="flex items-center justify-between gap-3">
                <div className="space-y-2">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-4 w-40" />
                </div>
                <Skeleton className="h-8 w-28 rounded-lg" />
              </div>
              <div className={`${masterListPageScrollRegionClass} space-y-2`}>
                {Array.from({ length: 3 }).map((_, index) => (
                  <Skeleton
                    key={index}
                    className="h-14 rounded-lg border border-[rgba(138,99,36,0.12)]"
                  />
                ))}
              </div>
            </div>

            <div className={`${st.sectionSurface} space-y-3 p-4`}>
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-4 w-44" />
              <div className="flex flex-wrap gap-2">
                <Skeleton className="h-9 w-36 rounded-lg" />
                <Skeleton className="h-9 w-40 rounded-lg" />
              </div>
            </div>
          </div>
        </div>
      </MasterContentStack>
    </MasterShellPage>
  );
}
