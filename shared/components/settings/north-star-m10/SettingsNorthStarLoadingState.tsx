import {
  MasterContentStack,
  MasterPageHeader,
  MasterShellPage,
} from "@/shared/design-system/shell";
import { st } from "./settings-north-star-styles";

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

export function SettingsNorthStarLoadingState() {
  return (
    <MasterShellPage density="compact" className={st.pageCanvas}>
      <MasterPageHeader
        title="Settings"
        subtitle="Configure your company, team, billing defaults, and system preferences."
        density="compact"
        surfaceVariant="northStar"
        className={`north-star-settings-page-header ${st.pageHeader}`}
        titleClassName={st.pageHeaderTitle}
        subtitleClassName={st.pageHeaderSubtitle}
      />

      <MasterContentStack
        density="compact"
        className="settings-north-star-workspace min-w-0 space-y-3 px-3 sm:space-y-3.5 sm:px-3.5 lg:px-5"
      >
        <div className={`${st.sectionSurface} overflow-hidden`}>
          <div className="border-b border-[rgba(138,99,36,0.12)] px-3 py-2.5 sm:px-4 sm:py-3 lg:px-5">
            <Skeleton className="h-2.5 w-16" />
            <Skeleton className="mt-1.5 h-4 w-32" />
            <Skeleton className="mt-1.5 h-3 w-64 max-w-full" />
          </div>
          <div className="px-3 py-3 sm:px-4 sm:py-4 lg:px-5">
            <Skeleton className="h-36 rounded-[1rem] border border-[rgba(138,99,36,0.12)]" />
          </div>
        </div>

        <div className={`${st.sectionSurface} overflow-hidden`}>
          <div className="border-b border-[rgba(138,99,36,0.12)] px-3 py-2.5 sm:px-4 sm:py-3 lg:px-5">
            <Skeleton className="h-2.5 w-12" />
            <Skeleton className="mt-1.5 h-4 w-40" />
            <Skeleton className="mt-1.5 h-3 w-72 max-w-full" />
          </div>
          <div className="space-y-3 px-3 py-3 sm:px-4 sm:py-4 lg:px-5">
            <Skeleton className="h-20 rounded-[1rem] border border-[rgba(138,99,36,0.12)]" />
            <div className="overflow-hidden rounded-[1rem] border border-[rgba(138,99,36,0.12)]">
              <div className="flex flex-col gap-2 border-b border-[rgba(138,99,36,0.12)] bg-[#F5F0E4] px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:px-4 sm:py-3">
                <Skeleton className="h-5 w-24" />
                <div className="flex gap-2">
                  <Skeleton className="h-8 w-28 rounded-lg" />
                  <Skeleton className="h-8 w-28 rounded-lg md:hidden" />
                </div>
                <Skeleton className="h-10 w-full rounded-lg sm:max-w-xs" />
              </div>
              <Skeleton className="mx-4 hidden h-24 rounded-xl md:mx-6 md:block" />
              <div className="space-y-3 p-4 sm:p-6">
                {Array.from({ length: 5 }).map((_, index) => (
                  <div key={index} className="flex items-center gap-4">
                    <Skeleton className="h-9 w-9 shrink-0 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-40" />
                      <Skeleton className="h-3 w-56" />
                    </div>
                    <Skeleton className="h-8 w-28" />
                    <Skeleton className="hidden h-6 w-16 rounded-full md:block" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className={`${st.sectionSurface} overflow-hidden`}>
          <div className="border-b border-[rgba(138,99,36,0.12)] px-3 py-2.5 sm:px-4 sm:py-3 lg:px-5">
            <Skeleton className="h-2.5 w-24" />
            <Skeleton className="mt-1.5 h-4 w-36" />
            <Skeleton className="mt-1.5 h-3 w-56 max-w-full" />
          </div>
          <div className="px-3 py-3 sm:px-4 sm:py-4 lg:px-5">
            <Skeleton className="h-48 rounded-[1rem] border border-[rgba(138,99,36,0.12)]" />
          </div>
        </div>

        <div className={`${st.sectionSurface} overflow-hidden`}>
          <div className="border-b border-[rgba(138,99,36,0.12)] px-3 py-2.5 sm:px-4 sm:py-3 lg:px-5">
            <Skeleton className="h-2.5 w-20" />
            <Skeleton className="mt-1.5 h-4 w-40" />
            <Skeleton className="mt-1.5 h-3 w-56 max-w-full" />
          </div>
          <div className="px-3 py-3 sm:px-4 sm:pb-4 lg:px-5">
            <Skeleton className="h-10 rounded-xl md:hidden" />
            <div className="hidden gap-2.5 md:grid md:grid-cols-2">
              {Array.from({ length: 2 }).map((_, index) => (
                <Skeleton
                  key={index}
                  className="h-24 rounded-[1rem] border border-[rgba(138,99,36,0.12)]"
                />
              ))}
            </div>
          </div>
        </div>

        <div className={`${st.sectionSurface} overflow-hidden`}>
          <div className="border-b border-[rgba(138,99,36,0.12)] px-3 py-2.5 sm:px-4 sm:py-3 lg:px-5">
            <Skeleton className="h-2.5 w-14" />
            <Skeleton className="mt-1.5 h-4 w-44" />
            <Skeleton className="mt-1.5 h-3 w-56 max-w-full" />
          </div>
          <div className="space-y-3 px-3 py-3 sm:px-4 sm:pb-4 lg:px-5">
            <Skeleton className="h-16 rounded-[1rem] border border-[rgba(138,99,36,0.12)] sm:max-w-xl" />
            <Skeleton className="h-10 rounded-xl md:hidden" />
          </div>
        </div>
      </MasterContentStack>
    </MasterShellPage>
  );
}
