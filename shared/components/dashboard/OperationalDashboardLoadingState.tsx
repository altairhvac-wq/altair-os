function Skeleton({ className }: { className?: string }) {
  return <div className={`admin-skeleton ${className ?? ""}`} />;
}

export function OperationalDashboardLoadingState() {
  return (
    <div className="space-y-4">
      <div className="hidden lg:block">
        <Skeleton className="h-28 w-full rounded-2xl" />
      </div>

      <section className="admin-command-surface overflow-hidden p-3 lg:hidden">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="mt-2 h-5 w-40" />
        <div className="mt-3 grid grid-cols-2 gap-1.5">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-lg" />
          ))}
        </div>
      </section>

      <div className="flex gap-2 overflow-hidden lg:hidden">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-24 shrink-0 rounded-full" />
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="admin-card p-4">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="mt-3 h-8 w-20" />
            <div className="mt-4 space-y-3">
              {Array.from({ length: 3 }).map((_, j) => (
                <Skeleton key={j} className="h-12 w-full rounded-xl" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
