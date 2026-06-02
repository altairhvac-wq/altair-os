function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={`admin-skeleton ${className ?? ""}`}
    />
  );
}

export function DispatchLoadingState() {
  return (
    <div className="flex flex-col gap-2 sm:gap-4 lg:h-[calc(100dvh-7rem)] lg:overflow-hidden">
      <Skeleton className="h-14 shrink-0 rounded-2xl" />

      <div className="flex shrink-0 gap-2 overflow-hidden">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-28 shrink-0 rounded-xl" />
        ))}
      </div>

      <Skeleton className="hidden h-12 shrink-0 rounded-xl lg:block" />

      <div className="flex min-h-0 lg:flex-1 flex-col gap-2 sm:gap-4 lg:flex-row">
        <div className="flex min-h-0 lg:flex-1 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="border-b border-slate-100 px-4 py-3">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="mt-2 hidden h-3 w-56 sm:block" />
          </div>
          <div className="space-y-3 p-3 sm:p-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-20 rounded-xl" />
            ))}
          </div>
        </div>

        <div className="hidden w-[380px] shrink-0 flex-col rounded-2xl border border-slate-200 bg-white p-5 lg:flex">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="mt-2 h-4 w-48" />
          <div className="mt-6 space-y-4">
            <Skeleton className="h-24 w-full rounded-xl" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        </div>
      </div>
    </div>
  );
}
