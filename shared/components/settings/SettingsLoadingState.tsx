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

export function SettingsLoadingState() {
  return (
    <MasterShellPage density="compact">
      <MasterPageCanvas width="standard">
        <MasterContentStack density="compact">
          <MasterPageHeader
            title="Settings"
            subtitle="Workspace, team, and document defaults"
            density="compact"
            secondaryAction={
              <Skeleton className="hidden h-4 w-48 sm:block" />
            }
          />

          <MasterPageSection
            title="Company"
            description="Profile, locale, and workspace status"
            density="compact"
          >
            <MasterPageSurface variant="card" className="min-w-0 p-3 md:hidden">
              <Skeleton className="h-3 w-28" />
              <div className="mt-3 space-y-2">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className="flex items-center justify-between gap-3">
                    <Skeleton className="h-3 w-16" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                ))}
              </div>
            </MasterPageSurface>

            <div className="hidden min-w-0 gap-2.5 md:grid md:grid-cols-2 md:gap-3 xl:grid-cols-4">
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

          <MasterPageSection
            title="Team"
            description="Members, invitations, and workspace access"
            density="compact"
          >
            <Skeleton className="h-20 rounded-xl" />

            <MasterPageSurface
              variant="card"
              className="min-w-0 max-w-full overflow-x-clip"
            >
              <div
                className={`${masterPanelHeaderClass} flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between`}
              >
                <div className="space-y-2">
                  <Skeleton className="h-5 w-24" />
                  <Skeleton className="hidden h-4 w-72 max-w-full sm:block" />
                </div>
                <div className="flex gap-2">
                  <Skeleton className="h-8 w-28 rounded-lg" />
                  <Skeleton className="h-8 w-28 rounded-lg md:hidden" />
                </div>
                <Skeleton className="h-10 w-full rounded-lg sm:max-w-xs" />
              </div>

              <Skeleton className="mx-4 hidden h-24 rounded-xl md:mx-6 md:block" />

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

          <MasterPageSection
            title="Documents & Billing Defaults"
            description="Defaults for new estimates and invoices"
            density="compact"
          >
            <MasterPageSurface variant="card" className="min-w-0 p-4 sm:p-5">
              <div className="flex items-start gap-3">
                <Skeleton className="h-9 w-9 shrink-0 rounded-lg" />
                <div className="min-w-0 flex-1 space-y-2">
                  <Skeleton className="h-5 w-48" />
                  <Skeleton className="h-4 w-full max-w-md" />
                </div>
              </div>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className="space-y-2">
                    <Skeleton className="h-3 w-24" />
                    <Skeleton className="h-10 w-full rounded-lg" />
                  </div>
                ))}
              </div>
            </MasterPageSurface>
          </MasterPageSection>

          <MasterPageSection
            title="Setup & Tools"
            description="Onboarding, demo data, and diagnostics"
            density="compact"
          >
            <div className="grid min-w-0 gap-2.5 sm:gap-3 lg:grid-cols-2 lg:items-start">
              <Skeleton className="h-44 rounded-xl" />
              <Skeleton className="h-44 rounded-xl" />
            </div>
            <Skeleton className="h-16 rounded-xl sm:max-w-xl" />
          </MasterPageSection>

          <MasterPageSection title="Coming soon" density="compact">
            <Skeleton className="h-10 rounded-xl md:hidden" />
            <div className="hidden min-w-0 gap-2.5 md:grid md:grid-cols-2 md:gap-3 lg:grid-cols-3">
              {Array.from({ length: 4 }).map((_, index) => (
                <MasterPageSurface
                  key={index}
                  variant="card"
                  className="min-w-0 p-3 sm:p-4"
                >
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="mt-2 h-3 w-full max-w-xs" />
                </MasterPageSurface>
              ))}
            </div>
          </MasterPageSection>
        </MasterContentStack>
      </MasterPageCanvas>
    </MasterShellPage>
  );
}
