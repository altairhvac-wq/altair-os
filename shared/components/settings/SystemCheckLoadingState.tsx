import {
  MasterContentStack,
  MasterPageCanvas,
  MasterPageHeader,
  MasterPageSection,
  MasterPageSurface,
  MasterShellPage,
} from "@/shared/design-system/shell";

function Skeleton({ className }: { className?: string }) {
  return <div className={`admin-skeleton ${className ?? ""}`} />;
}

export function SystemCheckLoadingState() {
  return (
    <MasterShellPage density="compact">
      <MasterPageCanvas width="standard">
        <MasterContentStack density="compact">
          <MasterPageHeader
            title="System Check"
            subtitle="Read-only production readiness checks for the internal alpha."
            density="compact"
            secondaryAction={
              <Skeleton className="hidden h-3 w-48 sm:block sm:max-w-xs" />
            }
          />

          <Skeleton className="h-3 w-56 sm:hidden" />

          <div className="grid gap-2.5 sm:grid-cols-2 sm:gap-3 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <MasterPageSurface
                key={index}
                variant="card"
                className="min-w-0 p-3 sm:p-3.5"
              >
                <Skeleton className="h-3 w-16" />
                <Skeleton className="mt-3 h-6 w-10" />
              </MasterPageSurface>
            ))}
          </div>

          <MasterPageSection
            title="Checks"
            description="These probes are read-only and safe to run in production."
            density="compact"
          >
            <MasterPageSurface
              variant="card"
              className="min-w-0 max-w-full overflow-x-clip"
            >
              {Array.from({ length: 6 }).map((_, index) => (
                <div
                  key={index}
                  className="flex flex-col gap-3 border-b border-slate-100 px-4 py-4 last:border-b-0 sm:px-6"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-5 w-14 rounded-full" />
                  </div>
                  <Skeleton className="h-4 w-full max-w-xl" />
                  <Skeleton className="h-4 w-3/4 max-w-md" />
                </div>
              ))}
            </MasterPageSurface>
          </MasterPageSection>

          <MasterPageSection
            title="Deploy documentation"
            description="Use the repo checklists for Vercel env vars, Supabase Auth URLs, and the full internal alpha smoke test."
            density="compact"
          >
            <MasterPageSurface
              variant="section"
              className="border-dashed border-slate-300 p-4 sm:p-5"
            >
              <div className="flex items-start gap-3">
                <Skeleton className="h-10 w-10 shrink-0 rounded-xl" />
                <div className="min-w-0 flex-1 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-full max-w-md" />
                </div>
              </div>
            </MasterPageSurface>
          </MasterPageSection>
        </MasterContentStack>
      </MasterPageCanvas>
    </MasterShellPage>
  );
}
