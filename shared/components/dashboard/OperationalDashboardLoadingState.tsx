import {
  MasterContentStack,
  MasterPageCanvas,
  MasterPageSection,
  MasterPageSurface,
  MasterShellPage,
} from "@/shared/design-system/shell";
import { HorizonHero } from "@/shared/design-system/signature";
import { signatureCockpitSurfaceClass } from "@/shared/design-system/shell/tokens";

function Skeleton({ className }: { className?: string }) {
  return <div className={`admin-skeleton ${className ?? ""}`} />;
}

function CockpitSkeleton({ variant }: { variant: "desktop" | "mobile" }) {
  const isMobile = variant === "mobile";

  return (
    <HorizonHero
      tone="cyan"
      beamTone="cyan"
      size={isMobile ? "compact" : "cockpit"}
    >
      <div
        aria-hidden="true"
        className={signatureCockpitSurfaceClass}
      >
        <div
          className={
            isMobile
              ? "flex flex-col gap-2"
              : "flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between lg:gap-6"
          }
        >
          <div className="min-w-0 flex-1">
            <Skeleton className="h-2.5 w-24" />
            <Skeleton className="mt-2 h-5 w-44" />
            <Skeleton className="mt-2 h-4 w-full max-w-md" />
          </div>
          {!isMobile ? (
            <Skeleton className="h-[4.5rem] w-full max-w-xs rounded-lg lg:shrink-0" />
          ) : null}
        </div>

        {isMobile ? (
          <div className="mt-3 grid grid-cols-2 gap-3 border-t border-slate-200/40 pt-3">
            <Skeleton className="h-10" />
            <Skeleton className="h-10" />
          </div>
        ) : (
          <div className="mt-3 border-t border-slate-200/45 pt-3">
            <Skeleton className="h-2 w-28" />
            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="h-14" />
              ))}
            </div>
            <Skeleton className="mt-3 h-2 w-24" />
            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={`today-${index}`} className="h-14" />
              ))}
            </div>
          </div>
        )}
      </div>
    </HorizonHero>
  );
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
      <CockpitSkeleton variant="desktop" />
      <Skeleton className="h-24 w-full rounded-xl" />

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
      <CockpitSkeleton variant="mobile" />
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
