function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={`admin-skeleton ${className ?? ""}`}
    />
  );
}

export function SettingsLoadingState() {
  return (
    <div className="min-w-0 max-w-full space-y-6">
      <div>
        <Skeleton className="h-8 w-56" />
        <Skeleton className="mt-2 h-4 w-96 max-w-full" />
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <Skeleton className="h-3 w-20" />
            <Skeleton className="mt-3 h-6 w-32" />
            <Skeleton className="mt-2 h-4 w-24" />
          </div>
        ))}
      </section>

      <section className="admin-card min-w-0 max-w-full overflow-x-clip">
        <div className="border-b border-slate-100 px-4 py-4 sm:px-6">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="mt-2 h-4 w-72 max-w-full" />
          <Skeleton className="mt-4 h-10 w-full sm:max-w-xs" />
        </div>
        <div className="space-y-3 p-4 sm:p-6">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="flex items-center gap-4">
              <Skeleton className="h-9 w-9 shrink-0 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-56" />
              </div>
              <Skeleton className="h-8 w-28" />
              <Skeleton className="hidden h-6 w-16 rounded-full md:block" />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
