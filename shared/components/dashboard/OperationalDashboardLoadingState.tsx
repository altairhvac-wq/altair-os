import {
  MasterContentStack,
  MasterPageCanvas,
  MasterPageSection,
  MasterPageSurface,
  MasterShellPage,
} from "@/shared/design-system/shell";
import { MISSION_CONTROL_SECTION_LABELS } from "@/shared/lib/dashboard-mission-control";

function Skeleton({ className }: { className?: string }) {
  return <div className={`admin-skeleton ${className ?? ""}`} />;
}

function GreetingSkeleton() {
  return (
    <MasterPageSurface variant="card" className="p-4 sm:p-5">
      <Skeleton className="h-6 w-56" />
      <Skeleton className="mt-2 h-4 w-44" />
      <Skeleton className="mt-3 h-4 w-40" />
    </MasterPageSurface>
  );
}

function MissionCriticalSkeleton() {
  return (
    <MasterPageSection
      title={MISSION_CONTROL_SECTION_LABELS.missionCritical}
      density="compact"
    >
      <div className="grid gap-2 lg:grid-cols-2 lg:gap-3">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-28 w-full rounded-xl" />
        ))}
      </div>
    </MasterPageSection>
  );
}

function MetricGridSkeleton({ columns = 4 }: { columns?: number }) {
  return (
    <div
      className={`grid grid-cols-2 gap-2 sm:gap-3 ${
        columns === 5 ? "xl:grid-cols-5" : "xl:grid-cols-4"
      }`}
    >
      {Array.from({ length: columns }).map((_, index) => (
        <Skeleton key={index} className="h-24 w-full rounded-xl" />
      ))}
    </div>
  );
}

function ChartSkeleton() {
  return (
    <MasterPageSurface variant="card" className="p-4">
      <Skeleton className="h-4 w-32" />
      <Skeleton className="mt-2 h-3 w-48" />
      <Skeleton className="mt-4 h-36 w-full rounded-xl" />
    </MasterPageSurface>
  );
}

function TimelineSkeleton() {
  return (
    <MasterPageSection
      title={MISSION_CONTROL_SECTION_LABELS.activityTimeline}
      density="compact"
    >
      <MasterPageSurface variant="card" className="divide-y divide-slate-100">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="px-4 py-3">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="mt-2 h-3 w-full max-w-md" />
          </div>
        ))}
      </MasterPageSurface>
    </MasterPageSection>
  );
}

function QuickActionsSkeleton() {
  return (
    <MasterPageSection
      title={MISSION_CONTROL_SECTION_LABELS.quickActions}
      density="compact"
    >
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton key={index} className="h-16 w-full rounded-xl" />
        ))}
      </div>
    </MasterPageSection>
  );
}

export function OperationalDashboardLoadingState() {
  return (
    <MasterShellPage density="compact">
      <MasterPageCanvas width="wide">
        <MasterContentStack density="compact" aria-busy="true" aria-live="polite">
          <GreetingSkeleton />
          <MissionCriticalSkeleton />
          <MasterPageSection
            title={MISSION_CONTROL_SECTION_LABELS.todaysOperations}
            density="compact"
          >
            <MetricGridSkeleton columns={5} />
          </MasterPageSection>
          <div className="grid gap-2 lg:grid-cols-2 lg:gap-3">
            <ChartSkeleton />
            <ChartSkeleton />
          </div>
          <MasterPageSection
            title={MISSION_CONTROL_SECTION_LABELS.cashFlow}
            density="compact"
          >
            <MetricGridSkeleton columns={4} />
          </MasterPageSection>
          <TimelineSkeleton />
          <QuickActionsSkeleton />
        </MasterContentStack>
      </MasterPageCanvas>
    </MasterShellPage>
  );
}
