import {
  MasterContentStack,
  MasterPageCanvas,
  MasterPageSection,
  MasterShellPage,
  altairSurfaceSectionBodyClass,
  altairSurfaceSectionClass,
} from "@/shared/design-system/shell";
import {
  ModuleGrid,
  ModuleGridItem,
} from "@/shared/design-system/layout";
import { MISSION_CONTROL_SECTION_LABELS } from "@/shared/lib/dashboard-mission-control";

function Skeleton({ className }: { className?: string }) {
  return <div className={`admin-skeleton ${className ?? ""}`} />;
}

function GreetingSkeleton() {
  return (
    <div className="px-0.5">
      <Skeleton className="h-6 w-52" />
      <Skeleton className="mt-2 h-4 w-64" />
      <Skeleton className="mt-1.5 h-3 w-40" />
    </div>
  );
}

function NeedsAttentionSkeleton() {
  return (
    <ModuleGrid rhythm="compact">
      <ModuleGridItem span={2} size="m">
        <MasterPageSection
          title={MISSION_CONTROL_SECTION_LABELS.missionCritical}
          density="compact"
          headerVariant="spacious"
        >
          <div className={`${altairSurfaceSectionClass} space-y-0 px-2 py-1`}>
            {Array.from({ length: 3 }).map((_, index) => (
              <div
                key={index}
                className="flex items-center justify-between gap-3 px-2 py-3"
              >
                <Skeleton className="h-4 w-36" />
                <Skeleton className="h-5 w-8" />
              </div>
            ))}
          </div>
        </MasterPageSection>
      </ModuleGridItem>
    </ModuleGrid>
  );
}

function BriefGridSkeleton({
  columns = 4,
  wide = false,
}: {
  columns?: number;
  wide?: boolean;
}) {
  return (
    <div className={`${altairSurfaceSectionClass} ${altairSurfaceSectionBodyClass}`}>
      <div
        className={`grid grid-cols-2 gap-x-6 gap-y-5 ${
          wide ? "lg:grid-cols-4" : ""
        }`}
      >
        {Array.from({ length: columns }).map((_, index) => (
          <div key={index} className="min-w-0">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="mt-2 h-7 w-16" />
            <Skeleton className="mt-2 h-3 w-28" />
          </div>
        ))}
      </div>
    </div>
  );
}

function QuickActionsSkeleton() {
  return (
    <ModuleGrid rhythm="compact">
      <ModuleGridItem span={1} size="s">
        <MasterPageSection
          title={MISSION_CONTROL_SECTION_LABELS.quickActions}
          density="compact"
          headerVariant="spacious"
        >
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-8 w-24 rounded-md" />
            ))}
          </div>
        </MasterPageSection>
      </ModuleGridItem>
    </ModuleGrid>
  );
}

function TimelineSkeleton() {
  return (
    <MasterPageSection
      title={MISSION_CONTROL_SECTION_LABELS.activityTimeline}
      density="compact"
      headerVariant="spacious"
    >
      <div className={`${altairSurfaceSectionClass} divide-y divide-slate-100`}>
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="flex items-start gap-3 px-3.5 py-3.5">
            <Skeleton className="h-8 w-8 shrink-0 rounded-lg" />
            <div className="min-w-0 flex-1">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="mt-2 h-3 w-full max-w-md" />
            </div>
          </div>
        ))}
      </div>
    </MasterPageSection>
  );
}

export function OperationalDashboardLoadingState() {
  return (
    <MasterShellPage density="compact">
      <MasterPageCanvas width="wide">
        <MasterContentStack
          density="compact"
          className="gap-5 lg:gap-6"
          aria-busy="true"
          aria-live="polite"
        >
          <GreetingSkeleton />
          <NeedsAttentionSkeleton />
          <MasterPageSection
            title={MISSION_CONTROL_SECTION_LABELS.todaysOperations}
            density="compact"
            headerVariant="spacious"
          >
            <BriefGridSkeleton columns={4} />
          </MasterPageSection>
          <QuickActionsSkeleton />
          <MasterPageSection
            title={MISSION_CONTROL_SECTION_LABELS.cashFlow}
            density="compact"
            headerVariant="spacious"
          >
            <BriefGridSkeleton columns={4} wide />
          </MasterPageSection>
          <TimelineSkeleton />
        </MasterContentStack>
      </MasterPageCanvas>
    </MasterShellPage>
  );
}
