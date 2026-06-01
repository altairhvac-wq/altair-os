function Skeleton({ className }: { className?: string }) {
  return <div className={`admin-skeleton ${className ?? ""}`} />;
}

function DesktopLoadingSkeleton() {
  return (
    <>
      <section className="admin-command-strip-surface overflow-hidden p-2.5 lg:p-3">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="mt-1.5 h-4 w-36" />
        <Skeleton className="mt-2 h-2.5 w-28" />
        <div className="mt-2 grid grid-cols-2 gap-1.5 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-[3.75rem] rounded-lg" />
          ))}
        </div>
        <Skeleton className="mt-2 h-2.5 w-24" />
        <div className="mt-1.5 grid grid-cols-2 gap-1.5 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={`today-${i}`} className="h-[3.75rem] rounded-lg" />
          ))}
        </div>
      </section>

      {Array.from({ length: 4 }).map((_, sectionIndex) => (
        <div key={sectionIndex} className="space-y-2">
          <div className="border-b border-slate-200/80 pb-1.5">
            <Skeleton className="h-3.5 w-32" />
            <Skeleton className="mt-1.5 h-2.5 w-56 max-w-full" />
          </div>
          <div className="grid gap-2 lg:grid-cols-2">
            {Array.from({ length: 2 }).map((_, cardIndex) => (
              <div key={cardIndex} className="admin-card p-3">
                <Skeleton className="h-3.5 w-28" />
                <Skeleton className="mt-2 h-6 w-16" />
                <div className="mt-3 space-y-2">
                  {Array.from({ length: 2 }).map((_, rowIndex) => (
                    <Skeleton key={rowIndex} className="h-10 w-full rounded-lg" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </>
  );
}

function MobileLoadingSkeleton() {
  return (
    <div className="space-y-2">
      <Skeleton className="h-[4.5rem] w-full rounded-lg" />
      <Skeleton className="h-[3.25rem] w-full rounded-lg" />
      <Skeleton className="h-[3.25rem] w-full rounded-lg" />

      <div className="space-y-1">
        <Skeleton className="h-3 w-28" />
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full rounded-lg" />
        ))}
      </div>

      <Skeleton className="h-10 w-full rounded-lg" />
    </div>
  );
}

export function OperationalDashboardLoadingState() {
  return (
    <div className="space-y-3">
      <div className="hidden lg:block">
        <DesktopLoadingSkeleton />
      </div>
      <div className="lg:hidden">
        <MobileLoadingSkeleton />
      </div>
    </div>
  );
}
