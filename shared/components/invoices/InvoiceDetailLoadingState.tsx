function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-lg bg-slate-200/80 ${className ?? ""}`}
    />
  );
}

export function InvoiceDetailLoadingState() {
  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <Skeleton className="h-5 w-32" />

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="space-y-4 border-b border-slate-100 bg-slate-50/70 px-5 py-5 sm:px-6">
          <div className="space-y-2">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-9 w-48 sm:h-10" />
          </div>
          <div className="flex flex-wrap gap-2">
            <Skeleton className="h-6 w-20" />
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-6 w-32" />
          </div>
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
