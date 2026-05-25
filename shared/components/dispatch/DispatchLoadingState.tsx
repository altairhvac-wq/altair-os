function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-lg bg-slate-200/80 ${className ?? ""}`}
    />
  );
}

export function DispatchLoadingState() {
  return (
    <div className="flex h-[calc(100vh-7rem)] flex-col gap-4 overflow-hidden">
      <div className="grid shrink-0 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-2xl" />
        ))}
      </div>

      <Skeleton className="h-20 shrink-0 rounded-2xl" />

      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden lg:flex-row">
        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden lg:flex-row lg:overflow-x-auto">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="flex w-full shrink-0 flex-col rounded-2xl border border-slate-200 bg-white lg:w-72"
            >
              <div className="border-b border-slate-100 p-4">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-xl" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
              </div>
              <div className="space-y-3 p-3">
                {Array.from({ length: 2 }).map((_, j) => (
                  <Skeleton key={j} className="h-36 rounded-xl" />
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="hidden w-[380px] shrink-0 flex-col rounded-2xl border border-slate-200 bg-white p-5 lg:flex">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="mt-2 h-4 w-48" />
          <div className="mt-8 space-y-4">
            <Skeleton className="h-28 w-full rounded-xl" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        </div>
      </div>
    </div>
  );
}
