function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={`admin-skeleton ${className ?? ""}`}
    />
  );
}

export function EstimateDetailLoadingState() {
  return (
    <div
      className="mx-auto min-w-0 max-w-5xl space-y-5 overflow-x-hidden"
      aria-busy="true"
      aria-live="polite"
    >
      <p className="sr-only">Loading estimate details…</p>
      <Skeleton className="h-5 w-32" />

      <div className="overflow-hidden admin-card">
        <div className="space-y-4 border-b border-slate-100 bg-white px-5 py-5 sm:px-6">
          <div className="space-y-2">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-9 w-48 sm:h-10" />
          </div>
          <div className="flex flex-wrap gap-2">
            <Skeleton className="h-6 w-20" />
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-6 w-32" />
          </div>
          <Skeleton className="h-14 w-full sm:hidden" />
        </div>
        <div className="grid gap-5 p-5 sm:p-6 lg:grid-cols-3">
          <Skeleton className="h-28 w-full lg:col-span-2" />
          <Skeleton className="h-28 w-full" />
        </div>
      </div>

      <Skeleton className="h-48 w-full rounded-2xl" />
      <Skeleton className="h-56 w-full rounded-2xl" />
    </div>
  );
}
