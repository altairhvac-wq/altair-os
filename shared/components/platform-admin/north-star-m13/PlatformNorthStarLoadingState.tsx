import {
  MasterContentStack,
  MasterPageHeader,
  MasterShellPage,
} from "@/shared/design-system/shell";
import { pt } from "./platform-north-star-styles";

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

export function PlatformNorthStarLoadingState() {
  return (
    <MasterShellPage density="compact" className={pt.pageCanvas}>
      <MasterPageHeader
        eyebrow="Internal operations"
        title="Platform"
        subtitle="Cross-tenant visibility and internal admin controls for the app owner."
        density="compact"
        surfaceVariant="northStar"
        className={`north-star-platform-page-header ${pt.pageHeader}`}
        eyebrowClassName={pt.pageHeaderEyebrow}
        titleClassName={pt.pageHeaderTitle}
        subtitleClassName={pt.pageHeaderSubtitle}
        secondaryAction={<Skeleton dark className="h-9 w-32 rounded-lg" />}
      />

      <MasterContentStack density="compact" className={pt.workspaceStack}>
        <Skeleton className="h-20 rounded-[1rem] border border-[rgba(138,99,36,0.12)]" />

        <div className={`${pt.sectionSurface}`}>
          <div className={pt.panelHeader}>
            <Skeleton className="h-2.5 w-24" />
            <Skeleton className="mt-1.5 h-4 w-36" />
            <Skeleton className="mt-1.5 h-3 w-64 max-w-full" />
          </div>
          <div className="grid grid-cols-2 gap-2.5 p-3 sm:grid-cols-3 sm:gap-3 sm:p-4 lg:grid-cols-4 lg:px-5">
            {Array.from({ length: 7 }).map((_, index) => (
              <Skeleton
                key={index}
                className="h-24 rounded-[1rem] border border-[rgba(138,99,36,0.12)]"
              />
            ))}
          </div>
        </div>

        <div className={`${pt.sectionSurface}`}>
          <div className={pt.panelHeader}>
            <Skeleton className="h-2.5 w-24" />
            <Skeleton className="mt-1.5 h-4 w-40" />
            <Skeleton className="mt-1.5 h-3 w-56 max-w-full" />
          </div>
          <div className="p-3 sm:p-4 lg:px-5">
            <Skeleton className="h-16 rounded-[1rem] border border-[rgba(138,99,36,0.12)]" />
          </div>
        </div>

        <div className="grid min-w-0 gap-3 lg:grid-cols-2 lg:gap-4">
          {Array.from({ length: 2 }).map((_, index) => (
            <div key={index} className={pt.sectionSurface}>
              <div className={pt.panelHeader}>
                <Skeleton className="h-2.5 w-20" />
                <Skeleton className="mt-1.5 h-4 w-36" />
                <Skeleton className="mt-1.5 h-3 w-48 max-w-full" />
              </div>
              <div className="space-y-3 px-3 py-3 sm:px-4 sm:py-4 lg:px-5">
                {Array.from({ length: 4 }).map((__, rowIndex) => (
                  <div key={rowIndex} className="flex items-center gap-3">
                    <div className="min-w-0 flex-1 space-y-2">
                      <Skeleton className="h-4 w-40" />
                      <Skeleton className="h-3 w-56" />
                    </div>
                    <Skeleton className="h-3 w-16" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className={pt.sectionSurface}>
            <div className={pt.panelHeader}>
              <Skeleton className="h-2.5 w-24" />
              <Skeleton className="mt-1.5 h-4 w-44" />
              <Skeleton className="mt-1.5 h-3 w-72 max-w-full" />
            </div>
            <div className="px-3 py-3 sm:px-4 sm:py-4 lg:px-5">
              <Skeleton className="h-48 rounded-[1rem] border border-[rgba(138,99,36,0.12)]" />
            </div>
          </div>
        ))}
      </MasterContentStack>
    </MasterShellPage>
  );
}
