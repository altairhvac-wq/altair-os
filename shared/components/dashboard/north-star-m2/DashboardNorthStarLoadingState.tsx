import {
  MasterContentStack,
  MasterPageCanvas,
  MasterShellPage,
} from "@/shared/design-system/shell";
import { northStarTokens as t } from "@/shared/design-system/north-star/tokens";

function Skeleton({ className }: { className?: string }) {
  return <div className={`admin-skeleton ${className ?? ""}`} />;
}

function NorthStarHeroSkeleton() {
  return (
    <section aria-busy="true" aria-label="Loading command hero" className={t.heroShell}>
      <div aria-hidden="true" className={t.heroAccentRail} />
      <div className={t.heroHeader}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1">
            <Skeleton className="h-2.5 w-32 bg-slate-700/50" />
            <Skeleton className="mt-3 h-7 w-56 bg-slate-700/50" />
            <Skeleton className="mt-2 h-4 w-full max-w-lg bg-slate-700/40" />
          </div>
          <Skeleton className="h-10 w-36 rounded-lg bg-slate-700/50" />
        </div>
      </div>
      <div className={t.heroBody}>
        <Skeleton className="h-28 w-full rounded-xl bg-slate-700/40" />
        <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_auto]">
          <div className="space-y-3">
            <Skeleton className="h-2.5 w-24 bg-slate-700/40" />
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-9 w-40 rounded-lg bg-slate-700/35" />
              ))}
            </div>
            <Skeleton className="h-16 w-full rounded-lg bg-slate-700/35" />
          </div>
          <div className="grid grid-cols-2 gap-2 lg:w-[20rem]">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-14 rounded-lg bg-slate-700/35" />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function NorthStarBoardSkeleton() {
  return (
    <section aria-busy="true" aria-label="Loading operating board" className={t.operatingBoard}>
      <div aria-hidden="true" className={t.boardTopAccent} />
      <div className={t.boardHeader}>
        <Skeleton className="h-2.5 w-28 bg-white/10" />
        <Skeleton className="mt-2 h-6 w-48 bg-white/10" />
        <Skeleton className="mt-2 h-4 w-96 max-w-full bg-white/10" />
      </div>
      <div className="grid lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, col) => (
          <div key={col} className={`space-y-3 p-5 ${t.columnWell}`}>
            <Skeleton className="h-16 w-full rounded-lg bg-white/10" />
            {Array.from({ length: 3 }).map((_, row) => (
              <Skeleton key={row} className="h-14 w-full rounded-lg bg-[#FCFBF8]/20" />
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}

function NorthStarFooterSkeleton() {
  return (
    <footer aria-busy="true" aria-label="Loading supporting bands" className={t.footer}>
      <div aria-hidden="true" className={t.footerTopAccent} />
      <div className="grid gap-3 p-3 sm:grid-cols-4 sm:p-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-lg bg-white/10" />
        ))}
      </div>
      <div className="grid gap-3 p-3 sm:p-4 lg:grid-cols-2">
        <Skeleton className="h-32 rounded-lg bg-white/10" />
        <Skeleton className="h-32 rounded-lg bg-white/10" />
      </div>
    </footer>
  );
}

function MobileLoadingSkeleton() {
  return (
    <MasterContentStack density="compact">
      <Skeleton className="h-32 w-full rounded-xl" />
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

export function DashboardNorthStarLoadingState() {
  return (
    <MasterShellPage density="compact">
      <MasterPageCanvas width="wide">
        <MasterContentStack density="compact" className="hidden lg:flex">
          <NorthStarHeroSkeleton />
          <NorthStarBoardSkeleton />
          <NorthStarFooterSkeleton />
        </MasterContentStack>
        <div className="min-w-0 lg:hidden">
          <MobileLoadingSkeleton />
        </div>
      </MasterPageCanvas>
    </MasterShellPage>
  );
}
