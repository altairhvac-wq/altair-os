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

export function ReportsNorthStarLoadingState() {
  return (
    <MasterShellPage density="compact" className={lt.pageCanvas}>
      <MasterPageHeader
        eyebrow="Operating brief"
        title="Reports"
        subtitle="Revenue, cash flow, tax readiness, and operational signals for your business."
        density="compact"
        surfaceVariant="northStar"
        className={`north-star-reports-page-header ${lt.pageHeader}`}
        eyebrowClassName={lt.pageHeaderEyebrow}
        titleClassName={lt.pageHeaderTitle}
        subtitleClassName={lt.pageHeaderSubtitle}
        secondaryAction={
          <Skeleton className="h-9 w-36 shrink-0 rounded-lg border border-[rgba(201,164,77,0.22)]" />
        }
        primaryAction={
          <Skeleton className="h-9 w-40 shrink-0 rounded-lg border border-[rgba(201,164,77,0.22)]" />
        }
      />

      <MasterContentStack
        density="compact"
        className="reports-north-star-brief min-w-0 px-3 sm:px-3.5 lg:px-5"
      >
        <Skeleton className="h-11 rounded-[1rem] border border-[rgba(138,99,36,0.12)]" />

        <Skeleton className="h-36 rounded-[1.25rem] border border-[rgba(138,99,36,0.12)]" />

        <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4 lg:gap-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton
              key={index}
              className="h-28 rounded-[1.25rem] border border-[rgba(138,99,36,0.12)]"
            />
          ))}
        </div>

        <div className="grid gap-2.5 lg:grid-cols-12 lg:gap-3">
          <Skeleton className="h-72 rounded-[1.25rem] border border-[rgba(138,99,36,0.12)] lg:col-span-8" />
          <Skeleton className="h-44 rounded-[1.25rem] border border-[rgba(138,99,36,0.12)] lg:col-span-4" />
          <Skeleton className="h-52 rounded-[1.25rem] border border-[rgba(138,99,36,0.12)] lg:col-span-6" />
          <Skeleton className="h-52 rounded-[1.25rem] border border-[rgba(138,99,36,0.12)] lg:col-span-6" />
        </div>

        <Skeleton className="h-48 rounded-[1.25rem] border border-[rgba(138,99,36,0.12)]" />
        <Skeleton className="h-20 rounded-[1rem] border border-[rgba(138,99,36,0.12)]" />

        <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-4 lg:gap-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton
              key={index}
              className="h-40 rounded-[1.25rem] border border-[rgba(138,99,36,0.12)]"
            />
          ))}
        </div>
      </MasterContentStack>
    </MasterShellPage>
  );
}
