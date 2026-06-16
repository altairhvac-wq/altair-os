import { listDetailListSectionClassName } from "@/shared/components/layout/list-detail-layout";
import {
  adminCompactSummaryMetricClass,
  adminCompactSummaryStripClass,
  adminCompactSummaryStripInnerClass,
} from "@/shared/lib/admin-density";
import {
  MasterContentStack,
  MasterPageCanvas,
  MasterPageHeader,
  MasterPageSection,
  MasterPageSurface,
  MasterShellPage,
  masterListPageScrollRegionClass,
  masterPanelHeaderClass,
} from "@/shared/design-system/shell";

function Skeleton({ className }: { className?: string }) {
  return <div className={`admin-skeleton ${className ?? ""}`} />;
}

const NETWORK_TAB_COUNT = 5;
const REFERRAL_METRIC_COUNT = 7;

function ReferralSummarySkeleton() {
  return (
    <>
      <div className={adminCompactSummaryStripClass} aria-hidden="true">
        <div className={adminCompactSummaryStripInnerClass}>
          {Array.from({ length: REFERRAL_METRIC_COUNT }).map((_, index) => (
            <div
              key={index}
              className={`${adminCompactSummaryMetricClass} ${
                index > 0 ? "border-l border-slate-200 pl-3" : ""
              }`}
            >
              <Skeleton className="h-3 w-8" />
              <Skeleton className="h-4 w-6" />
            </div>
          ))}
        </div>
      </div>
      <div className="hidden shrink-0 gap-2.5 sm:grid sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
        {Array.from({ length: REFERRAL_METRIC_COUNT }).map((_, index) => (
          <Skeleton key={index} className="admin-metric-card h-24" />
        ))}
      </div>
    </>
  );
}

export function NetworkLoadingState() {
  return (
    <MasterShellPage fillViewport density="compact">
      <MasterPageCanvas width="wide" className="min-h-0 flex-1">
        <MasterContentStack density="compact" className="shrink-0">
          <MasterPageHeader
            eyebrow="Altair Network"
            title="Send and receive trusted trade referrals."
            subtitle="Build trusted partner relationships, pass overflow work, and keep every opportunity inside Altair."
            density="compact"
            secondaryAction={
              <Skeleton className="h-11 w-11 shrink-0 rounded-2xl" />
            }
          />

          <MasterPageSurface
            variant="section"
            className="flex flex-wrap items-center justify-between gap-3 !rounded-2xl !p-4"
          >
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-64 max-w-full" />
            </div>
            <Skeleton className="h-9 w-36 shrink-0 rounded-xl" />
          </MasterPageSurface>

          <MasterContentStack density="compact">
            <MasterPageSection title="Sent referrals">
              <ReferralSummarySkeleton />
            </MasterPageSection>

            <MasterPageSection title="Received referrals">
              <ReferralSummarySkeleton />
            </MasterPageSection>
          </MasterContentStack>

          <nav
            className="flex gap-1 overflow-x-auto rounded-xl border border-slate-200 bg-white p-1"
            aria-hidden="true"
          >
            {Array.from({ length: NETWORK_TAB_COUNT }).map((_, index) => (
              <Skeleton key={index} className="h-9 w-28 shrink-0 rounded-lg" />
            ))}
          </nav>
        </MasterContentStack>

        <MasterContentStack density="compact" scrollable className="min-h-0 lg:flex-1">
          <div className="flex min-h-0 min-w-0 flex-col gap-4 lg:flex-1 lg:flex-row lg:overflow-hidden">
            <MasterPageSurface
              variant="card"
              className={`${listDetailListSectionClassName} flex min-h-[16rem] min-w-0 flex-[1_1_55%] flex-col lg:min-h-0 lg:flex-1 lg:overflow-hidden`}
            >
              <div className={masterPanelHeaderClass}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="space-y-2">
                    <Skeleton className="h-5 w-24" />
                    <Skeleton className="h-3 w-56 max-w-full" />
                  </div>
                  <Skeleton className="h-3 w-20" />
                </div>
                <div className="mt-3 flex gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1">
                  <Skeleton className="h-8 w-24 rounded-lg" />
                  <Skeleton className="h-8 w-28 rounded-lg" />
                </div>
                <Skeleton className="mt-3 h-10 w-full rounded-lg" />
              </div>

              <div className={`${masterListPageScrollRegionClass} space-y-3 p-3 sm:p-4`}>
                {Array.from({ length: 6 }).map((_, index) => (
                  <Skeleton key={index} className="h-24 rounded-xl" />
                ))}
              </div>
            </MasterPageSurface>

            <div className="hidden min-h-[12rem] min-w-0 flex-[1_1_45%] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white lg:flex lg:min-h-0 lg:w-[400px] lg:flex-none lg:shrink-0">
              <div className="border-b border-slate-100 p-5">
                <Skeleton className="h-5 w-36" />
                <Skeleton className="mt-2 h-4 w-48" />
              </div>
              <div className="space-y-4 p-5">
                <Skeleton className="h-20 w-full rounded-xl" />
                <Skeleton className="h-16 w-full rounded-xl" />
                <Skeleton className="h-24 w-full rounded-xl" />
              </div>
            </div>
          </div>
        </MasterContentStack>
      </MasterPageCanvas>
    </MasterShellPage>
  );
}
