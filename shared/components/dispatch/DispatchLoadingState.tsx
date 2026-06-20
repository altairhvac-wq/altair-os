import {
  MasterContentStack,
  MasterPageCanvas,
  MasterPageHeader,
  MasterPageSurface,
  MasterShellPage,
  masterWorkbenchRowClass,
} from "@/shared/design-system/shell";
import {
  northStarDispatchTokens as dt,
  northStarListTokens as lt,
} from "@/shared/design-system/north-star/tokens";

function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={`admin-skeleton ${className ?? ""}`}
    />
  );
}

function NorthStarSkeleton({
  className,
  dark = false,
}: {
  className?: string;
  dark?: boolean;
}) {
  return (
    <div
      className={`north-star-skeleton ${dark ? "north-star-skeleton-dark" : ""} ${className ?? ""}`}
    />
  );
}

function DispatchHeaderSkeleton() {
  return (
    <MasterPageHeader
      density="compact"
      title="Dispatch"
      subtitle="Assign technicians and manage today's board."
    />
  );
}

function DispatchNorthStarHeaderSkeleton() {
  return (
    <MasterPageHeader
      title="Dispatch"
      subtitle="Assign technicians and manage today's board."
      density="compact"
      surfaceVariant="northStar"
      className={`north-star-dispatch-page-header ${lt.pageHeader}`}
      titleClassName={lt.pageHeaderTitle}
      subtitleClassName={lt.pageHeaderSubtitle}
    />
  );
}

function DispatchBoardSkeleton() {
  return (
    <div className={masterWorkbenchRowClass}>
      <MasterPageSurface variant="panel" className="lg:flex-1">
        <div className="admin-panel-header shrink-0 px-3 py-2 sm:px-4 sm:py-3">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="mt-2 hidden h-3 w-56 sm:block" />
        </div>
        <div className="space-y-3 p-3 sm:p-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
      </MasterPageSurface>

      <div className="hidden w-[380px] shrink-0 flex-col rounded-2xl border border-slate-200 bg-white p-5 lg:flex">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="mt-2 h-4 w-48" />
        <div className="mt-6 space-y-4">
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      </div>
    </div>
  );
}

function DispatchNorthStarBoardSkeleton() {
  return (
    <div className={masterWorkbenchRowClass}>
      <div className={`${dt.boardSurface} max-w-full lg:flex-1`}>
        <div className={dt.boardSurfaceTopAccent} aria-hidden />
        <div className={`${dt.boardHeader} flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between`}>
          <div className="min-w-0 space-y-2">
            <NorthStarSkeleton dark className="h-4 w-40" />
            <NorthStarSkeleton dark className="hidden h-3 w-56 sm:block" />
          </div>
          <NorthStarSkeleton
            dark
            className="h-9 w-28 shrink-0 rounded-lg border border-[rgba(201,164,77,0.22)]"
          />
        </div>
        <div className={`${dt.boardBody} space-y-2.5 sm:space-y-3`}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="flex min-w-0 max-w-full gap-2 overflow-hidden rounded-xl border border-[rgba(138,99,36,0.14)] bg-[#FBF7EF] sm:rounded-2xl"
            >
              <div className={`${dt.laneHeader} shrink-0 sm:w-44 lg:w-48`}>
                <NorthStarSkeleton
                  dark
                  className="h-8 w-8 shrink-0 rounded-lg sm:h-9 sm:w-9"
                />
                <div className="min-w-0 flex-1 space-y-1.5 sm:space-y-2">
                  <NorthStarSkeleton dark className="h-3.5 w-24" />
                  <NorthStarSkeleton dark className="hidden h-2.5 w-16 sm:block" />
                </div>
              </div>
              <div className="flex min-w-0 flex-1 gap-2 overflow-hidden p-2 sm:p-2.5">
                <NorthStarSkeleton className="h-[4.75rem] w-[12rem] shrink-0 rounded-xl sm:h-[5.5rem] sm:w-[13.25rem]" />
                <NorthStarSkeleton className="h-[4.75rem] w-[12rem] shrink-0 rounded-xl sm:h-[5.5rem] sm:w-[13.25rem]" />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="hidden lg:flex lg:h-full lg:min-h-0 lg:w-[380px] lg:shrink-0 lg:flex-col lg:overflow-hidden">
        <div className={`${dt.detailPanelShell} min-h-[20rem] flex-1`}>
          <div className={dt.detailPanelTopAccent} aria-hidden />
          <div className={`${dt.detailPanelHeader} space-y-2`}>
            <NorthStarSkeleton dark className="h-5 w-32" />
            <NorthStarSkeleton dark className="h-3 w-48" />
          </div>
          <div className="min-h-0 flex-1 space-y-3 bg-[#FBF7EF] p-4 sm:p-5">
            <NorthStarSkeleton className="h-24 w-full rounded-xl" />
            <NorthStarSkeleton className="h-20 w-full rounded-xl" />
            <NorthStarSkeleton className="h-16 w-full rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function DispatchNorthStarLoadingState() {
  return (
    <MasterShellPage fillViewport density="compact" className={`${lt.pageCanvas} ${dt.pageCanvas}`}>
      <MasterPageCanvas width="wide" className="min-h-0 flex-1">
        <MasterContentStack
          density="compact"
          scrollable
          className="min-h-0 flex-1"
        >
          <DispatchNorthStarHeaderSkeleton />

          <NorthStarSkeleton
            className="h-12 shrink-0 rounded-xl border border-[rgba(138,99,36,0.12)]"
          />

          <DispatchNorthStarBoardSkeleton />
        </MasterContentStack>
      </MasterPageCanvas>
    </MasterShellPage>
  );
}

export function DispatchLoadingState() {
  return (
    <MasterShellPage fillViewport density="compact">
      <MasterPageCanvas width="wide" className="min-h-0 flex-1">
        <MasterContentStack
          density="compact"
          scrollable
          className="min-h-0 flex-1"
        >
          <DispatchHeaderSkeleton />

          <Skeleton className="h-12 shrink-0 rounded-xl" />

          <DispatchBoardSkeleton />
        </MasterContentStack>
      </MasterPageCanvas>
    </MasterShellPage>
  );
}
