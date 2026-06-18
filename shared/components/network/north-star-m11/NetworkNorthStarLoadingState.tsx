import {
  MasterContentStack,
  MasterPageHeader,
  MasterShellPage,
  masterListPageScrollRegionClass,
} from "@/shared/design-system/shell";
import { listDetailListSectionClassName } from "@/shared/components/layout/list-detail-layout";
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

const NETWORK_TAB_COUNT = 5;

function ReferralSummarySkeleton() {
  return (
    <div className="flex flex-wrap gap-1.5 sm:gap-2" aria-hidden="true">
      {Array.from({ length: 7 }).map((_, index) => (
        <Skeleton
          key={index}
          className="h-8 w-[5.5rem] rounded-lg border border-[rgba(138,99,36,0.10)]"
        />
      ))}
    </div>
  );
}

export function NetworkNorthStarLoadingState() {
  return (
    <MasterShellPage fillViewport density="compact" className={st.pageCanvas}>
      <MasterPageHeader
        eyebrow="Partner command"
        title="Network"
        subtitle="Trusted partners, referral handoffs, and invitations in one operational view."
        density="compact"
        surfaceVariant="northStar"
        className={`north-star-network-page-header ${st.pageHeader}`}
        eyebrowClassName={st.pageHeaderEyebrow}
        titleClassName={st.pageHeaderTitle}
        subtitleClassName={st.pageHeaderSubtitle}
        primaryAction={<Skeleton dark className="h-9 w-36 rounded-lg" />}
      />

      <MasterContentStack density="compact" className={st.workspaceStack}>
        <div className={st.profileVisibilityStrip}>
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-64 max-w-full" />
          </div>
          <Skeleton className="h-9 w-36 shrink-0 rounded-lg" />
        </div>

        <div className={st.referralPulseSurface}>
          <div className="grid gap-3 p-3 sm:p-3.5 lg:grid-cols-2 lg:gap-4 lg:px-4 lg:py-3">
            <div>
              <Skeleton className="h-4 w-28" />
              <div className="mt-2">
                <ReferralSummarySkeleton />
              </div>
            </div>
            <div>
              <Skeleton className="h-4 w-32" />
              <div className="mt-2">
                <ReferralSummarySkeleton />
              </div>
            </div>
          </div>
        </div>

        <div className={`${st.sectionSurface} overflow-hidden`}>
          <div className={st.tabBand}>
            <div className={`${st.tabControl} overflow-x-auto`} aria-hidden="true">
              {Array.from({ length: NETWORK_TAB_COUNT }).map((_, index) => (
                <Skeleton key={index} className="h-9 w-28 shrink-0 rounded-md" />
              ))}
            </div>
          </div>

          <div className="p-3 pb-4 sm:p-4 sm:pb-5 lg:px-5 lg:pb-6">
            <div className="flex min-h-0 min-w-0 flex-col gap-4 lg:flex-row lg:overflow-hidden">
              <div
                className={`${st.sectionSurface} ${listDetailListSectionClassName} flex min-h-[16rem] min-w-0 flex-[1_1_55%] flex-col lg:min-h-[24rem] lg:flex-1 lg:overflow-hidden`}
              >
                <div className={st.panelHeader}>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="space-y-2">
                      <Skeleton className="h-2.5 w-16" />
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-3 w-56 max-w-full" />
                    </div>
                    <Skeleton className="h-3 w-20" />
                  </div>
                  <div className={`${st.filterControl} mt-3`}>
                    <Skeleton className="h-8 w-24 rounded-md" />
                    <Skeleton className="h-8 w-28 rounded-md" />
                  </div>
                  <Skeleton className="mt-3 h-10 w-full rounded-lg" />
                </div>

                <div className={`${masterListPageScrollRegionClass} space-y-3 p-3 sm:p-4`}>
                  {Array.from({ length: 6 }).map((_, index) => (
                    <Skeleton
                      key={index}
                      className="h-24 rounded-[1rem] border border-[rgba(138,99,36,0.12)]"
                    />
                  ))}
                </div>
              </div>

              <div className={`${st.detailPanel} hidden lg:flex`}>
                <div className={st.detailPanelHeader}>
                  <Skeleton className="h-5 w-36" />
                  <Skeleton className="mt-2 h-4 w-48" />
                </div>
                <div className="space-y-4 p-5">
                  <Skeleton className="h-20 w-full rounded-[1rem]" />
                  <Skeleton className="h-16 w-full rounded-[1rem]" />
                  <Skeleton className="h-24 w-full rounded-[1rem]" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </MasterContentStack>
    </MasterShellPage>
  );
}
