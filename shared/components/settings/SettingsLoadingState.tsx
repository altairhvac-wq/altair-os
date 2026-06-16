import {
  MasterContentStack,
  MasterPageCanvas,
  MasterPageSection,
  MasterPageSurface,
  MasterShellPage,
} from "@/shared/design-system/shell";

function Skeleton({ className }: { className?: string }) {
  return <div className={`admin-skeleton ${className ?? ""}`} />;
}

export function SettingsLoadingState() {
  return (
    <MasterShellPage density="compact">
      <MasterPageCanvas width="standard">
        <MasterContentStack density="compact">
          <header className="admin-page-header flex shrink-0 items-center gap-2">
            <Skeleton className="h-6 w-24 sm:h-7 sm:w-28" />
            <Skeleton className="hidden h-4 w-56 sm:block" />
          </header>

          <MasterPageSection title="Company" density="compact">
            <div className="grid gap-2.5 sm:gap-3 md:grid-cols-2 xl:grid-cols-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <MasterPageSurface
                  key={index}
                  variant="card"
                  className="min-w-0 p-3 sm:p-3.5"
                >
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="mt-3 h-6 w-32" />
                  <Skeleton className="mt-2 h-4 w-24" />
                </MasterPageSurface>
              ))}
            </div>
          </MasterPageSection>

          <MasterPageSection title="Team" density="compact">
            <MasterPageSurface
              variant="card"
              className="min-w-0 max-w-full overflow-x-clip"
            >
              <div className="border-b border-slate-100 px-3 py-2 sm:px-4 sm:py-3">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="mt-2 hidden h-4 w-72 max-w-full sm:block" />
                <Skeleton className="mt-4 h-10 w-full sm:max-w-xs" />
              </div>
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
            </MasterPageSurface>
          </MasterPageSection>
        </MasterContentStack>
      </MasterPageCanvas>
    </MasterShellPage>
  );
}
