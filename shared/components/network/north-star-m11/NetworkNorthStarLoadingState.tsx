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
const REFERRAL_METRIC_COUNT = 7;

function ReferralSummarySkeleton() {
  return (
    <>
      <div
        className="invoice-north-star-summary-strip shrink-0 overflow-x-auto border-b border-[rgba(138,99,36,0.12)] bg-[#EFE4CB] px-3 py-2 sm:px-4"
        aria-hidden="true"
      >
        <div className="flex min-w-max items-stretch gap-0">
          {Array.from({ length: REFERRAL_METRIC_COUNT }).map((_, index) => (
            <div
              key={index}
              className={`flex min-w-[4.5rem] flex-col px-3 py-0.5 ${
                index > 0 ? "border-l border-[rgba(138,99,36,0.18)]" : ""
              }`}
            >
              <Skeleton className="h-3 w-8" />
              <Skeleton className="h-4 w-6" />
            </div>
          ))}
        </div>
      </div>
      <div className="hidden shrink-0 gap-3 sm:grid sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
        {Array.from({ length: REFERRAL_METRIC_COUNT }).map((_, index) => (
          <Skeleton
            key={index}
            className="h-24 rounded-[1rem] border border-[rgba(138,99,36,0.12)]"
          />
        ))}
      </div>
    </>
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

        <div className={`${st.sectionSurface} overflow-hidden`}>
          <div className={st.panelHeader}>
            <Skeleton className="h-2.5 w-16" />
            <Skeleton className="mt-1.5 h-4 w-28" />
            <Skeleton className="mt-1.5 h-3 w-56 max-w-full" />
          </div>
          <div className="p-3 sm:p-4 lg:px-5">
            <ReferralSummarySkeleton />
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

          <div className="p-3 sm:p-4 lg:px-5">
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
