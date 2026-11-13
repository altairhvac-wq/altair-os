import {
  MasterContentStack,
  MasterPageCanvas,
  MasterShellPage,
} from "@/shared/design-system/shell";

/**
 * Loading shape for the Reports page. It has the same outline as
 * ReportsOverviewView (title, four headline cards, a wide chart beside a
 * narrow list, then pairs of cards) on the same paper cards, so the frame
 * before the numbers arrive and the frame after are the same page. The
 * skeleton it replaced was the old dark layout, which would have flashed
 * dark before the light page appeared.
 */

const CARD_CLASS =
  "min-w-0 overflow-hidden rounded-[var(--radius-panel)] border border-altair-border/40 bg-altair-paper shadow-[var(--elev-hairline),var(--elev-2)]";

function Bone({ className }: { className?: string }) {
  return <div className={`north-star-skeleton ${className ?? ""}`} />;
}

function CardBones({ rows, className = "" }: { rows: number; className?: string }) {
  return (
    <div className={`${CARD_CLASS} p-4 sm:p-5 ${className}`}>
      <Bone className="h-4 w-36 rounded" />
      <Bone className="mt-2 h-3 w-52 max-w-full rounded" />
      <div className="mt-4 space-y-3">
        {Array.from({ length: rows }).map((_, index) => (
          <Bone key={index} className="h-4 w-full rounded" />
        ))}
      </div>
    </div>
  );
}

export function ReportsOverviewLoadingState() {
  return (
    <MasterShellPage density="compact" data-testid="page-reports-loading">
      <MasterPageCanvas width="wide">
        <MasterContentStack density="compact" className="min-w-0" aria-busy="true" aria-label="Loading reports">
          <header className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between lg:gap-6">
            <div>
              <Bone className="h-7 w-32 rounded" />
              <Bone className="mt-2 h-4 w-64 max-w-full rounded" />
            </div>
            <div className="flex flex-wrap gap-2">
              <Bone className="h-10 w-72 max-w-full rounded-[var(--radius-control)]" />
              <Bone className="h-10 w-32 rounded-[var(--radius-control)]" />
            </div>
          </header>

          <div className="grid min-w-0 grid-cols-2 gap-2.5 sm:gap-3 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className={`${CARD_CLASS} p-3.5 sm:p-4`}>
                <Bone className="h-3.5 w-24 rounded" />
                <Bone className="mt-2 h-7 w-28 rounded" />
                <Bone className="mt-2 h-3 w-32 max-w-full rounded" />
              </div>
            ))}
          </div>

          <div className="grid min-w-0 gap-3 lg:grid-cols-12">
            <div className={`${CARD_CLASS} p-4 sm:p-5 lg:col-span-8`}>
              <Bone className="h-4 w-36 rounded" />
              <Bone className="mt-4 h-52 w-full rounded-lg" />
            </div>
            <CardBones rows={5} className="lg:col-span-4" />
          </div>

          <div className="grid min-w-0 gap-3 lg:grid-cols-2">
            <CardBones rows={5} />
            <CardBones rows={4} />
          </div>
          <div className="grid min-w-0 gap-3 lg:grid-cols-2">
            <CardBones rows={5} />
            <CardBones rows={5} />
          </div>
        </MasterContentStack>
      </MasterPageCanvas>
    </MasterShellPage>
  );
}
