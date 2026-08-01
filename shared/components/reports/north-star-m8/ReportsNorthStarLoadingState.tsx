import {
  altairMcMetricLabelClass,
  altairReportCardClass,
  altairReportCardPadClass,
} from "@/shared/design-system/components";
import {
  MasterContentStack,
  MasterPageCanvas,
  MasterShellPage,
} from "@/shared/design-system/shell";

function Skeleton({ className }: { className?: string }) {
  return <div className={`north-star-skeleton ${className ?? ""}`} />;
}

export function ReportsNorthStarLoadingState() {
  return (
    <MasterShellPage density="compact">
      <MasterPageCanvas width="wide">
        <MasterContentStack density="compact" className="min-w-0">
          <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
            <div className="min-w-0">
              <p className={altairMcMetricLabelClass}>Operating brief</p>
              <h1 className="mt-1 text-2xl font-bold tracking-tight text-altair-ink-on-paper sm:text-3xl">
                Reports
              </h1>
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:justify-end sm:gap-2.5">
              <Skeleton className="h-10 w-44 rounded-lg border border-altair-border bg-altair-graphite" />
              <Skeleton className="h-10 w-40 rounded-lg border border-altair-border bg-altair-graphite" />
            </div>
          </header>

          <div className={`${altairReportCardClass} ${altairReportCardPadClass}`}>
            <Skeleton className="h-9 w-full rounded-md bg-white/[0.04] sm:w-64" />
          </div>

          {/* Tier 1 */}
          <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-3">
              <Skeleton className="h-5 w-36 rounded-md" />
              <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4 lg:gap-3">
                {Array.from({ length: 4 }).map((_, index) => (
                  <Skeleton
                    key={`ledger-${index}`}
                    className={`h-[8.5rem] ${altairReportCardClass}`}
                  />
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <Skeleton className="h-5 w-32 rounded-md" />
              <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4 lg:gap-3">
                {Array.from({ length: 4 }).map((_, index) => (
                  <Skeleton
                    key={`kpi-${index}`}
                    className={`h-[10rem] ${altairReportCardClass}`}
                  />
                ))}
              </div>
            </div>

            <div className="grid gap-2.5 lg:grid-cols-12 lg:gap-3">
              <Skeleton className="h-52 rounded-lg border border-altair-border bg-altair-graphite lg:col-span-12" />
              <Skeleton className="h-72 rounded-lg border border-altair-border bg-altair-graphite lg:col-span-8" />
              <Skeleton className="h-44 rounded-lg border border-altair-border bg-altair-graphite lg:col-span-4" />
            </div>
          </div>

          {/* Tier 2 */}
          <div className="flex flex-col gap-3.5 border-t border-altair-border/60 pt-4">
            <div className="grid gap-2.5 lg:grid-cols-2">
              <Skeleton className="h-48 rounded-lg border border-altair-border bg-altair-graphite" />
              <Skeleton className="h-48 rounded-lg border border-altair-border bg-altair-graphite" />
            </div>
            <div className="grid gap-2.5 lg:grid-cols-2">
              <Skeleton className="h-40 rounded-lg border border-altair-border bg-altair-graphite" />
              <Skeleton className="h-40 rounded-lg border border-altair-border bg-altair-graphite" />
            </div>
          </div>

          {/* Tier 3 */}
          <div className="flex flex-col gap-3 border-t border-altair-border/40 pt-3.5 opacity-90">
            <Skeleton className="h-3 w-24 rounded-md" />
            <Skeleton className="h-28 rounded-lg border border-altair-border bg-altair-graphite" />
            <Skeleton className="h-36 rounded-lg border border-altair-border bg-altair-graphite" />
            <Skeleton className="h-44 rounded-lg border border-altair-border bg-altair-graphite" />
          </div>
        </MasterContentStack>
      </MasterPageCanvas>
    </MasterShellPage>
  );
}
