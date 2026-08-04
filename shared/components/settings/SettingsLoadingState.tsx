import {
  altairMcCardClass,
  altairMcCardPadClass,
} from "@/shared/design-system/components/mc-surface";

function Skeleton({ className }: { className: string }) {
  return (
    <div
      className={`${className} animate-pulse rounded bg-altair-paper-subtle`}
    />
  );
}

export function SettingsLoadingState({
  northStar: _northStar = false,
}: {
  /** @deprecated MC v2 settings surface. */
  northStar?: boolean;
}) {
  return (
    <div aria-label="Loading Settings" aria-busy="true" className="min-w-0">
      <div className="border-b border-altair-border pb-4">
        <Skeleton className="h-7 w-40" />
        <Skeleton className="mt-2 h-4 w-full max-w-md" />
      </div>
      <div className="mt-5 space-y-3">
        <div className={`${altairMcCardClass} ${altairMcCardPadClass} space-y-3`}>
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-64 max-w-full" />
          <div className="space-y-3 pt-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="flex items-center gap-4">
                <Skeleton className="h-9 w-9 shrink-0" />
                <div className="min-w-0 flex-1">
                  <Skeleton className="h-4 w-40 max-w-full" />
                  <Skeleton className="mt-2 h-3 w-72 max-w-full" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
