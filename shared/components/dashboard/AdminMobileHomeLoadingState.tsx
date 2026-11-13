/**
 * Loading skeleton for the mobile admin home.
 *
 * ============================== THE FLASH THIS FIXES ==============================
 * The dashboard renders two trees and lets CSS choose between them:
 * AdminMobileHome under `md:hidden`, Mission Control under `hidden md:contents`.
 * Its loading boundary did not. app/(admin)/(home)/loading.tsx rendered
 * OperationalDashboardLoadingState (or its North Star variant) at every width,
 * and neither of those contains a single `md:` class -- both are the desktop
 * Mission Control shape.
 *
 * So on a phone the sequence was: a desktop-shaped skeleton on a light canvas,
 * held for as long as the dashboard takes to load -- measured at 8.4 s on the
 * scale-seeded tenant -- and then a completely different dark launcher layout
 * in its place. That is the "old layout appears before the current one" report:
 * not a hydration mismatch, not a duplicate mount, not a legacy fallback, and
 * not something a timeout would fix. The first frame was simply the wrong
 * layout, and the slower the page the longer it was wrong for.
 *
 * This skeleton matches AdminMobileHome's actual structure -- same light
 * canvas, same top bar, same "Needs attention" band, same two-tile grid -- so
 * the frame before the data and the frame after it are the same shape.
 */

function Skeleton({ className }: { className?: string }) {
  return <div className={`admin-skeleton ${className ?? ""}`} />;
}

export function AdminMobileHomeLoadingState() {
  return (
    <div
      aria-busy="true"
      aria-label="Loading home"
      data-testid="page-dashboard-mobile-loading"
      className="space-y-4 px-1 pb-4 pt-1"
    >
      {/* Greeting block, then the schedule shortcut */}
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="mt-2 h-6 w-44" />
        </div>
        <Skeleton className="h-11 w-11 rounded-xl" />
      </div>

      <section aria-label="Loading needs attention">
        <Skeleton className="h-2.5 w-28" />
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            key={index}
            className="mt-2 flex items-center gap-3 rounded-2xl bg-altair-paper px-3.5 py-3.5 border border-altair-border/40"
          >
            <Skeleton className="h-9 w-9 shrink-0 rounded-xl" />
            <div className="min-w-0 flex-1">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="mt-1.5 h-3 w-20" />
            </div>
            <Skeleton className="h-4 w-4 shrink-0 rounded" />
          </div>
        ))}
      </section>

      <div className="mt-5 grid grid-cols-2 gap-3">
        {Array.from({ length: 2 }).map((_, index) => (
          <div
            key={index}
            className="flex min-h-[9.5rem] flex-col rounded-2xl bg-altair-paper px-3.5 py-3.5 border border-altair-border/40"
          >
            <Skeleton className="h-2.5 w-16" />
            <Skeleton className="mt-2 h-9 w-14" />
            <div className="mt-auto space-y-1.5 pt-3">
              <Skeleton className="h-3.5 w-24" />
              <Skeleton className="h-3 w-20" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
