function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-lg bg-slate-200/80 ${className ?? ""}`}
    />
  );
}

export function CustomersLoadingState() {
  return (
    <div className="flex flex-col gap-4 lg:h-[calc(100dvh-7rem)] lg:flex-row lg:overflow-hidden">
      <div className="flex min-h-[16rem] min-w-0 flex-[1_1_55%] flex-col lg:overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm lg:min-h-0 lg:flex-1">
        <div className="border-b border-slate-100 p-4">
          <div className="flex items-center justify-between gap-4">
            <Skeleton className="h-10 w-64" />
            <Skeleton className="h-10 w-36" />
          </div>
          <div className="mt-3 flex gap-3">
            <Skeleton className="h-9 w-72" />
            <Skeleton className="h-9 w-36" />
          </div>
        </div>

        <div className="min-h-0 flex-1 lg:overflow-y-auto p-4">
          <div className="space-y-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-2 py-3">
                <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-56" />
                </div>
                <Skeleton className="h-6 w-16 rounded-full" />
                <Skeleton className="h-4 w-20" />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="hidden lg:flex min-h-[12rem] min-w-0 flex-[1_1_45%] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:min-h-0 lg:w-[380px] lg:flex-none lg:shrink-0">
        <Skeleton className="mx-auto h-16 w-16 rounded-full" />
        <Skeleton className="mx-auto mt-4 h-5 w-40" />
        <Skeleton className="mx-auto mt-2 h-4 w-28" />

        <div className="mt-8 space-y-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    </div>
  );
}
