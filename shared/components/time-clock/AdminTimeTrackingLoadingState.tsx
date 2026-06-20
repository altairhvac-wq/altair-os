import {
  MasterContentStack,
  MasterPageCanvas,
  MasterPageHeader,
  MasterPageSurface,
  MasterShellPage,
  masterListPageScrollRegionClass,
} from "@/shared/design-system/shell";

function Skeleton({ className }: { className?: string }) {
  return <div className={`admin-skeleton ${className ?? ""}`} />;
}

export function AdminTimeTrackingLoadingState() {
  return (
    <MasterShellPage density="compact">
      <MasterPageCanvas width="standard">
        <MasterContentStack density="compact">
          <MasterPageHeader
            title="Labor & Payroll"
            subtitle="Review time entries, approve labor, and prepare payroll."
            density="compact"
          />

          <MasterPageSurface variant="card">
            <div className="shrink-0 border-b border-slate-100/90 px-3 py-1.5 sm:px-4">
              <div className="grid grid-cols-4 gap-1 sm:flex sm:w-auto">
                {Array.from({ length: 4 }).map((_, index) => (
                  <Skeleton key={index} className="h-8 rounded-md sm:h-9 sm:w-28" />
                ))}
              </div>
            </div>

            <div className="shrink-0 border-b border-slate-100/90 px-4 py-3">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                <Skeleton className="h-10 w-full rounded-lg" />
                <Skeleton className="h-10 w-44 rounded-lg" />
              </div>
            </div>

            <div className={`${masterListPageScrollRegionClass} px-4 py-2`}>
              {Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="flex items-center gap-4 py-3">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-14" />
                  <Skeleton className="hidden h-4 w-28 sm:block" />
                  <Skeleton className="hidden h-4 w-16 md:block" />
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
