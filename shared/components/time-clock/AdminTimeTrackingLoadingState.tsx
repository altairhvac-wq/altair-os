import {
  MasterContentStack,
  MasterPageCanvas,
  MasterPageHeader,
  MasterPageSection,
  MasterPageSurface,
  MasterShellPage,
  masterPanelHeaderClass,
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
            title="Time & labor review"
            subtitle="Canonical shift, break, and job-labor entries for payroll accuracy. Technicians track time through Start work and Complete work on jobs."
            density="compact"
          />

          <div className="flex flex-wrap items-center gap-3">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-28" />
          </div>

          <MasterPageSection title="Active technicians" density="compact">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <MasterPageSurface
                  key={index}
                  variant="section"
                  className="rounded-2xl p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1 space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-40" />
                    </div>
                    <Skeleton className="h-6 w-20 rounded-full" />
                  </div>
                  <Skeleton className="mt-3 h-3 w-36" />
                </MasterPageSurface>
              ))}
            </div>
          </MasterPageSection>

          <MasterPageSurface variant="card">
            <div
              className={`${masterPanelHeaderClass} flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between`}
            >
              <div className="space-y-2">
                <Skeleton className="h-4 w-12" />
                <Skeleton className="h-3 w-48" />
              </div>
              <Skeleton className="h-10 w-44 rounded-lg" />
            </div>

            <div className="space-y-0 divide-y divide-slate-100 px-4 py-2">
              {Array.from({ length: 6 }).map((_, index) => (
                <div
                  key={index}
                  className="flex items-center gap-4 py-3"
                >
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
