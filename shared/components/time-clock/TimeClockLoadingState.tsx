import { listDetailListSectionClassName } from "@/shared/components/layout/list-detail-layout";
import {
  MasterContentStack,
  MasterPageCanvas,
  MasterPageHeader,
  MasterPageSurface,
  MasterShellPage,
} from "@/shared/design-system/shell";
import {
  masterListPageScrollRegionClass,
  masterListPageSurfaceClass,
} from "@/shared/design-system/shell/tokens";

function Skeleton({ className }: { className?: string }) {
  return <div className={`admin-skeleton ${className ?? ""}`} />;
}

export function TimeClockLoadingState() {
  return (
    <MasterShellPage density="compact">
      <MasterPageCanvas width="standard">
        <MasterContentStack density="compact">
          <MasterPageHeader
            title="Labor & payroll review"
            subtitle="Admin tools for shift exceptions and payroll review. Field labor is tracked automatically when technicians start and complete work on jobs."
            density="compact"
          />

          <div className="flex flex-wrap items-center gap-3">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-28" />
          </div>

          <Skeleton className="h-16 rounded-xl" />

          <MasterPageSurface variant="card">
            <div className="border-b border-slate-100 px-4 py-4">
              <div className="space-y-2">
                <Skeleton className="h-4 w-12" />
                <Skeleton className="h-3 w-48" />
              </div>
            </div>

            <div className="space-y-0 divide-y divide-slate-100 px-4 py-2">
              {Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="flex items-center gap-4 py-3">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="hidden h-4 w-28 sm:block" />
                  <Skeleton className="hidden h-4 w-28 md:block" />
                  <Skeleton className="hidden h-4 w-16 lg:block" />
                  <Skeleton className="hidden h-4 w-14 lg:block" />
                </div>
              ))}
            </div>
          </MasterPageSurface>
        </MasterContentStack>
      </MasterPageCanvas>
    </MasterShellPage>
  );
}

export function TimeClockPageViewLoadingState() {
  return (
    <MasterShellPage fillViewport density="compact">
      <MasterPageCanvas width="standard" className="min-h-0 flex-1">
        <MasterContentStack density="compact" scrollable className="min-h-0 flex-1">
          <div className="grid shrink-0 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-28 rounded-2xl" />
            ))}
          </div>

          <Skeleton className="h-44 shrink-0 rounded-2xl" />

          <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden lg:flex-row">
            <MasterPageSurface
              variant="card"
              className={`${listDetailListSectionClassName} ${masterListPageSurfaceClass} flex-[1_1_55%] lg:overflow-hidden`}
            >
              <div className="border-b border-slate-100 p-4">
                <div className="flex items-center justify-between gap-4">
                  <Skeleton className="h-10 w-64" />
                  <Skeleton className="h-10 w-36" />
                </div>
                <div className="mt-3 flex flex-wrap gap-3">
                  <Skeleton className="h-9 w-full max-w-md" />
                  <Skeleton className="h-9 w-36" />
                </div>
              </div>

              <div className={`${masterListPageScrollRegionClass} p-4`}>
                <div className="space-y-3">
                  {Array.from({ length: 8 }).map((_, index) => (
                    <div key={index} className="flex items-center gap-4 px-2 py-3">
                      <Skeleton className="h-4 w-20" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-36" />
                        <Skeleton className="h-3 w-48" />
                      </div>
                      <Skeleton className="h-4 w-16" />
                      <Skeleton className="h-6 w-20 rounded-full" />
                    </div>
                  ))}
                </div>
              </div>
            </MasterPageSurface>

            <div className="hidden min-h-[12rem] min-w-0 flex-[1_1_45%] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:flex lg:min-h-0 lg:w-[400px] lg:flex-none lg:shrink-0">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="mt-2 h-4 w-56" />
              <div className="mt-8 space-y-4">
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-20 w-full" />
              </div>
            </div>
          </div>
        </MasterContentStack>
      </MasterPageCanvas>
    </MasterShellPage>
  );
}
