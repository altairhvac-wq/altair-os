function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={`admin-skeleton ${className ?? ""}`}
    />
  );
}

export function JobDetailLoadingState() {
  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <Skeleton className="h-5 w-28" />

      <div className="overflow-hidden admin-card">
        <div className="space-y-4 border-b border-slate-100 bg-slate-50/70 px-5 py-5 sm:px-6">
          <div className="space-y-2">
            <Skeleton className="h-3 w-10" />
            <Skeleton className="h-9 w-48 sm:h-10" />
          </div>
          <div className="flex flex-wrap gap-2">
            <Skeleton className="h-6 w-28" />
            <Skeleton className="h-6 w-20" />
            <Skeleton className="h-6 w-16" />
            <Skeleton className="h-6 w-40" />
          </div>
          <div className="flex flex-wrap gap-2">
            <Skeleton className="h-9 w-28" />
            <Skeleton className="h-9 w-36" />
            <Skeleton className="h-9 w-32" />
          </div>
        </div>
        <div className="flex flex-col gap-4 px-5 py-5 sm:flex-row sm:justify-between sm:px-6">
          <div className="flex flex-1 gap-3">
            <Skeleton className="h-10 w-10 shrink-0 rounded-xl" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-56" />
              <Skeleton className="h-4 w-36" />
            </div>
          </div>
          <Skeleton className="h-16 w-full rounded-xl sm:w-44" />
        </div>
      </div>

      <Skeleton className="h-28 w-full rounded-2xl" />

      <div className="grid gap-5 lg:grid-cols-3">
        <Skeleton className="h-36 w-full rounded-2xl lg:col-span-2" />
        <Skeleton className="h-36 w-full rounded-2xl" />
        <Skeleton className="h-40 w-full rounded-2xl" />
        <Skeleton className="h-32 w-full rounded-2xl lg:col-span-2" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Skeleton className="h-28 w-full rounded-2xl" />
        <Skeleton className="h-28 w-full rounded-2xl" />
        <Skeleton className="h-28 w-full rounded-2xl" />
        <Skeleton className="h-28 w-full rounded-2xl" />
      </div>
    </div>
  );
}
