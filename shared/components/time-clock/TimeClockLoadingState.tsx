import {
  altairMcGridGapClass,
  altairMcListClass,
  altairMcTileClass,
} from "@/shared/design-system/components";
import { MasterPageHeader } from "@/shared/design-system/shell";

function Skeleton({ className }: { className?: string }) {
  return <div className={`admin-skeleton ${className ?? ""}`} />;
}

export function TimeClockLoadingState() {
  return (
    <div className="space-y-4">
      <MasterPageHeader
        title="Time Clock"
        subtitle="Shift history, live crew status, and missed clock-out corrections"
        density="compact"
        surfaceVariant="northStar"
      />

      <section className="space-y-2">
        <Skeleton className="h-3 w-24" />
        <div className={`grid grid-cols-2 ${altairMcGridGapClass} lg:grid-cols-4`}>
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className={altairMcTileClass}>
              <Skeleton className="h-3 w-16" />
              <Skeleton className="mt-2 h-8 w-10" />
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-2">
        <Skeleton className="h-3 w-16" />
        <div className={`grid grid-cols-1 ${altairMcGridGapClass} sm:grid-cols-3`}>
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className={altairMcTileClass}>
              <Skeleton className="h-3 w-20" />
              <Skeleton className="mt-2 h-8 w-14" />
            </div>
          ))}
        </div>
      </section>

      <div className={`${altairMcTileClass} flex items-center justify-between gap-3`}>
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-56 max-w-full" />
        </div>
        <Skeleton className="h-10 w-28 shrink-0 rounded-lg" />
      </div>

      <section className="space-y-2">
        <Skeleton className="h-3 w-28" />
        <div className={altairMcListClass}>
          <div className="space-y-0 divide-y divide-altair-border px-3.5">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="flex items-center gap-4 py-3">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="hidden h-4 w-28 sm:block" />
                <Skeleton className="hidden h-4 w-28 md:block" />
                <Skeleton className="h-4 w-14" />
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

export function TimeClockPageViewLoadingState() {
  return <TimeClockLoadingState />;
}
