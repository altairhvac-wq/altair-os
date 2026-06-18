import {
  MasterContentStack,
  MasterPageHeader,
  MasterShellPage,
} from "@/shared/design-system/shell";
import { northStarListTokens as lt } from "@/shared/design-system/north-star/tokens";

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

export function TimeNorthStarLoadingState() {
  return (
    <MasterShellPage density="compact" className={lt.pageCanvas}>
      <MasterPageHeader
        eyebrow="Labor control"
        title="Time & labor review"
        subtitle="Canonical shift, break, and job-labor entries for payroll accuracy."
        density="compact"
        surfaceVariant="northStar"
        className={`north-star-time-page-header ${lt.pageHeader}`}
        eyebrowClassName={lt.pageHeaderEyebrow}
        titleClassName={lt.pageHeaderTitle}
        subtitleClassName={lt.pageHeaderSubtitle}
        primaryAction={
          <Skeleton
            dark
            className="h-9 w-36 shrink-0 rounded-lg border border-[rgba(201,164,77,0.22)]"
          />
        }
        secondaryAction={
          <Skeleton
            dark
            className="h-9 w-40 shrink-0 rounded-lg border border-[rgba(201,164,77,0.22)]"
          />
        }
      />

      <MasterContentStack
        density="compact"
        className="time-north-star-brief min-w-0 space-y-3 px-3 sm:space-y-3.5 sm:px-3.5 lg:px-5"
      >
        <div className="north-star-list-surface overflow-hidden rounded-[1.25rem]">
          <div className="border-b border-[rgba(138,99,36,0.12)] px-3 py-2.5 sm:px-4 sm:py-3 lg:px-5">
            <Skeleton className="h-2.5 w-16" />
            <Skeleton className="mt-1.5 h-4 w-36" />
            <Skeleton className="mt-1.5 h-3 w-64 max-w-full" />
          </div>
          <div className="grid gap-2.5 px-3 py-3 sm:grid-cols-2 sm:px-4 sm:py-4 xl:grid-cols-3 lg:px-5">
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton
                key={index}
                className="h-28 rounded-[1rem] border border-[rgba(138,99,36,0.12)]"
              />
            ))}
          </div>
        </div>

        <div className="north-star-list-surface overflow-hidden rounded-[1.25rem]">
          <div className="border-b border-[rgba(138,99,36,0.12)] px-3 py-2.5 sm:px-4 sm:py-3 lg:px-5">
            <Skeleton className="h-2.5 w-20" />
            <Skeleton className="mt-1.5 h-4 w-28" />
            <Skeleton className="mt-1.5 h-3 w-72 max-w-full" />
          </div>

          <div className={`time-north-star-filter-bar ${lt.filterBar} shrink-0`}>
            <Skeleton className="h-9 w-full max-w-xs rounded-lg sm:w-48" />
          </div>

          <div className="space-y-2.5 px-3 py-3 md:hidden sm:px-4 sm:py-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton
                key={index}
                className="h-28 rounded-xl border border-[rgba(138,99,36,0.12)]"
              />
            ))}
          </div>

          <div className="time-north-star-ledger hidden space-y-0 px-4 py-3 md:block lg:px-5">
            {Array.from({ length: 6 }).map((_, index) => (
              <div
                key={index}
                className="flex items-center gap-4 border-b border-[rgba(138,99,36,0.10)] py-3.5 last:border-b-0"
              >
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-14" />
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-6 w-14 rounded-full" />
              </div>
            ))}
          </div>
        </div>
      </MasterContentStack>
    </MasterShellPage>
  );
}
