import {
  MasterContentStack,
  MasterPageCanvas,
  MasterPageSurface,
  MasterShellPage,
  masterWorkbenchRowClass,
} from "@/shared/design-system/shell";
import { HorizonHero } from "@/shared/design-system/signature";
import { signatureHeroContentClass } from "@/shared/design-system/shell/tokens";

function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={`admin-skeleton ${className ?? ""}`}
    />
  );
}

function DispatchHeaderSkeleton() {
  return (
    <HorizonHero tone="cyan" beamTone="cyan" beamPosition="left" size="compact">
      <div
        aria-hidden="true"
        className={`flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 sm:px-4 sm:py-3 ${signatureHeroContentClass}`}
      >
        <div className="min-w-0 flex-1">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="mt-1.5 hidden h-3 w-56 sm:block" />
        </div>
        <div className="flex shrink-0 gap-2">
          <Skeleton className="h-7 w-20 rounded-full" />
          <Skeleton className="h-7 w-24 rounded-full" />
        </div>
      </div>
    </HorizonHero>
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

          <div className="flex shrink-0 gap-2 overflow-hidden">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-28 shrink-0 rounded-xl" />
            ))}
          </div>

          <Skeleton className="hidden h-12 shrink-0 rounded-xl lg:block" />

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
        </MasterContentStack>
      </MasterPageCanvas>
    </MasterShellPage>
  );
}
