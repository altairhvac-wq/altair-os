function Skeleton({ className }: { className?: string }) {
  return <div className={`admin-skeleton ${className ?? ""}`} />;
}

export function OperationalDashboardLoadingState() {
  return (
    <div className="space-y-5">
      <section className="admin-command-surface overflow-hidden p-3 lg:p-4">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="mt-2 h-5 w-44" />
        <Skeleton className="mt-3 h-3 w-32" />
        <div className="mt-2 grid grid-cols-2 gap-1.5 lg:grid-cols-4 lg:gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-[4.5rem] rounded-lg" />
          ))}
        </div>
        <Skeleton className="mt-3 h-3 w-28" />
        <div className="mt-2 grid grid-cols-2 gap-1.5 lg:grid-cols-4 lg:gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={`today-${i}`} className="h-[4.5rem] rounded-lg" />
          ))}
        </div>
      </section>

      {Array.from({ length: 3 }).map((_, sectionIndex) => (
        <div key={sectionIndex} className="space-y-3">
          <div className="border-b border-slate-200/80 pb-2">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="mt-2 h-3 w-64 max-w-full" />
          </div>
          <div className="grid gap-3 lg:grid-cols-2 lg:gap-4">
            {Array.from({ length: 2 }).map((_, cardIndex) => (
              <div key={cardIndex} className="admin-card p-4">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="mt-3 h-8 w-20" />
                <div className="mt-4 space-y-3">
                  {Array.from({ length: 3 }).map((_, rowIndex) => (
                    <Skeleton key={rowIndex} className="h-12 w-full rounded-xl" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
