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

const DASHBOARD_LOADING_SECTIONS = [
  { title: "Operational health" },
  { title: "Today's work" },
  { title: "Revenue and billing" },
  {
    title: "Needs attention",
    description: "Priority signals and open queues",
  },
] as const;

function CommandStripSkeleton() {
  return (
    <section
      aria-hidden="true"
      className="admin-command-strip-surface min-w-0 overflow-hidden p-2.5 lg:p-3"
    >
      <Skeleton className="h-3 w-20" />
      <Skeleton className="mt-1.5 h-4 w-36" />
      <Skeleton className="mt-2 h-2.5 w-28" />
      <div className="mt-2 grid grid-cols-2 gap-1.5 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-[3.75rem] rounded-lg" />
        ))}
      </div>
      <Skeleton className="mt-2 h-2.5 w-24" />
      <div className="mt-1.5 grid grid-cols-2 gap-1.5 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={`today-${i}`} className="h-[3.75rem] rounded-lg" />
        ))}
      </div>
    </section>
  );
}

function SectionCardsSkeleton() {
  return (
    <div className="grid gap-2 lg:grid-cols-2">
      {Array.from({ length: 2 }).map((_, cardIndex) => (
        <MasterPageSurface key={cardIndex} variant="card" className="p-3">
          <Skeleton className="h-3.5 w-28" />
          <Skeleton className="mt-2 h-6 w-16" />
          <div className="mt-3 space-y-2">
            {Array.from({ length: 2 }).map((_, rowIndex) => (
              <Skeleton key={rowIndex} className="h-10 w-full rounded-lg" />
            ))}
          </div>
        </MasterPageSurface>
      ))}
    </div>
  );
}

function DesktopLoadingSkeleton() {
  return (
    <MasterContentStack density="compact" className="hidden lg:flex">
      <CommandStripSkeleton />

      {DASHBOARD_LOADING_SECTIONS.map((section) => (
        <MasterPageSection
          key={section.title}
          title={section.title}
          description={"description" in section ? section.description : undefined}
          density="compact"
        >
          <SectionCardsSkeleton />
        </MasterPageSection>
      ))}
    </MasterContentStack>
  );
}

function MobileLoadingSkeleton() {
  return (
    <MasterContentStack density="compact">
      <Skeleton className="h-[4.5rem] w-full rounded-lg" />
      <Skeleton className="h-[3.25rem] w-full rounded-lg" />
      <Skeleton className="h-[3.25rem] w-full rounded-lg" />

      <div className="space-y-1">
        <Skeleton className="h-3 w-28" />
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full rounded-lg" />
        ))}
      </div>

      <Skeleton className="h-10 w-full rounded-lg" />
    </MasterContentStack>
  );
}

export function OperationalDashboardLoadingState() {
  return (
    <MasterShellPage density="compact">
      <MasterPageCanvas width="wide">
        <DesktopLoadingSkeleton />
        <div className="min-w-0 lg:hidden">
          <MobileLoadingSkeleton />
        </div>
      </MasterPageCanvas>
    </MasterShellPage>
  );
}
