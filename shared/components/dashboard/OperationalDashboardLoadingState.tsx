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
    <MasterPageSurface variant="card" className="p-3 sm:p-4">
      <Skeleton className="h-5 w-48" />
      <Skeleton className="mt-2 h-3.5 w-64" />
    </MasterPageSurface>
  );
}

function PrimaryActionsRowSkeleton() {
  return (
    <div className="flex flex-wrap gap-2">
      {Array.from({ length: 4 }).map((_, index) => (
        <Skeleton key={index} className="h-9 w-28 rounded-lg" />
      ))}
    </div>
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
      <Skeleton className="mt-4 h-24 w-full rounded-xl" />
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
          <div key={index} className="flex items-start gap-3 px-4 py-3">
            <Skeleton className="h-8 w-8 shrink-0 rounded-lg" />
            <div className="min-w-0 flex-1">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="mt-2 h-3 w-full max-w-md" />
            </div>
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
      <div className="grid gap-2 sm:grid-cols-2">
        {Array.from({ length: 2 }).map((_, index) => (
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
          <PrimaryActionsRowSkeleton />
          <MissionCriticalSkeleton />
          <MasterPageSection
            title={MISSION_CONTROL_SECTION_LABELS.todaysOperations}
            density="compact"
          >
            <MetricGridSkeleton columns={5} />
          </MasterPageSection>
          <MasterPageSection
            title={MISSION_CONTROL_SECTION_LABELS.cashFlow}
            density="compact"
          >
            <MetricGridSkeleton columns={4} />
          </MasterPageSection>
          <div className="grid gap-2 lg:grid-cols-2 lg:gap-3">
            <ChartSkeleton />
            <ChartSkeleton />
          </div>
          <TimelineSkeleton />
          <QuickActionsSkeleton />
        </MasterContentStack>
      </MasterPageCanvas>
    </MasterShellPage>
  );
}
