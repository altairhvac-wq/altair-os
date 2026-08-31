import {
  MasterContentStack,
  MasterPageCanvas,
  MasterShellPage,
  masterWorkbenchRowClass,
} from "@/shared/design-system/shell";
import { dispatchMissionClasses as dm } from "./dispatch-board-presentation";

function DarkSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-md bg-white/[0.08] ${className ?? ""}`}
    />
  );
}

function DispatchInlineKpiSkeleton() {
  return (
    <div className={dm.metricStrip}>
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className={dm.metricTile}>
          <DarkSkeleton className="h-2 w-12" />
          <DarkSkeleton className="mt-1 h-4 w-8" />
        </div>
      ))}
    </div>
  );
}

function DispatchBoardSkeleton() {
  return (
    <div aria-busy="true" className={masterWorkbenchRowClass}>
      <div className={`${dm.boardSurface} max-w-full lg:flex-1`}>
        <div className={dm.boardHeader}>
          <div className="min-w-0 space-y-1.5">
            <DarkSkeleton className="h-4 w-40" />
            <DarkSkeleton className="hidden h-3 w-64 sm:block" />
          </div>
          <DispatchInlineKpiSkeleton />
        </div>
        <div className={`${dm.boardBody} gap-2`}>
          <div className="flex flex-col gap-2.5 lg:flex-row lg:items-stretch">
            <DarkSkeleton className="h-40 w-full shrink-0 rounded-lg lg:h-auto lg:w-[15.5rem]" />
            <div className="min-w-0 flex-1 space-y-2.5 overflow-hidden">
              <DarkSkeleton className="h-[min(16rem,28vh)] w-full rounded-lg sm:h-[min(18rem,30vh)] lg:h-[min(20rem,32vh)]" />
              <div className="min-h-0 flex-1 space-y-1.5 overflow-hidden">
                <div className="flex h-10 items-center gap-0 border-b border-altair-border">
                  <div className="w-44 shrink-0 sm:w-44 lg:w-48" />
                  <div className="flex flex-1 gap-8 px-2">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <DarkSkeleton key={i} className="h-2.5 w-8" />
                    ))}
                  </div>
                </div>
                {Array.from({ length: 3 }).map((_, i) => (
                  <div
                    key={i}
                    className="flex overflow-hidden rounded-lg border border-altair-border"
                  >
                    <div className="flex w-[10.5rem] shrink-0 flex-col justify-center gap-1.5 border-r border-altair-border bg-altair-graphite px-2 py-2 sm:w-44 lg:w-48">
                      <div className="flex items-center gap-2">
                        <DarkSkeleton className="h-8 w-8 rounded-lg" />
                        <div className="min-w-0 flex-1 space-y-1.5">
                          <DarkSkeleton className="h-3 w-20" />
                          <DarkSkeleton className="h-2.5 w-14" />
                        </div>
                      </div>
                    </div>
                    <div className="relative h-[5.25rem] flex-1 bg-white/[0.02]">
                      <DarkSkeleton className="absolute left-8 top-2 h-[4.25rem] w-[9.5rem] rounded-md" />
                      {i % 2 === 0 ? (
                        <DarkSkeleton className="absolute left-48 top-2 h-[4.25rem] w-[9.5rem] rounded-md" />
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function DispatchLoadingState() {
  return (
    <MasterShellPage
      fillViewport
      density="compact"
      className="h-[calc(100dvh-7rem)] min-h-0 overflow-hidden max-md:h-auto max-md:min-h-0 max-md:overflow-visible"
    >
      <MasterPageCanvas
        width="wide"
        className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden max-md:overflow-visible"
      >
        <div
          className={`${dm.pageCanvas} flex min-h-0 min-w-0 max-w-full flex-1 flex-col overflow-hidden p-2 max-md:overflow-visible sm:p-3`}
        >
          <MasterContentStack
            density="compact"
            scrollable
            className="min-h-0 flex-1 overflow-hidden max-md:overflow-visible"
          >
            <div className="min-h-0 flex-1 overflow-hidden">
              <DispatchBoardSkeleton />
            </div>
          </MasterContentStack>
        </div>
      </MasterPageCanvas>
    </MasterShellPage>
  );
}
