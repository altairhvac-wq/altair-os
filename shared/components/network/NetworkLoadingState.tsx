function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={`admin-skeleton ${className ?? ""}`}
    />
  );
}

export function NetworkLoadingState() {
  return (
    <div className="flex flex-col gap-4 lg:h-[calc(100dvh-7rem)] lg:overflow-hidden">
      <div className="shrink-0 space-y-3">
        <Skeleton className="h-8 w-72" />
        <Skeleton className="h-4 w-96" />
        <div className="flex gap-2 pt-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-28 rounded-full" />
          ))}
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden lg:flex-row">
        <div className="flex min-h-[16rem] min-w-0 flex-[1_1_55%] flex-col lg:overflow-hidden admin-card lg:min-h-0 lg:flex-1">
          <div className="border-b border-slate-100 p-4">
            <Skeleton className="h-10 w-64" />
            <div className="mt-3 flex gap-3">
              <Skeleton className="h-9 w-72" />
              <Skeleton className="h-9 w-36" />
              <Skeleton className="h-9 w-36" />
            </div>
          </div>

          <div className="grid gap-4 p-4 sm:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="rounded-xl border border-slate-100 p-4 space-y-3"
              >
                <div className="flex items-center gap-3">
                  <Skeleton className="h-11 w-11 rounded-xl" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-36" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
                <Skeleton className="h-16 w-full" />
              </div>
            ))}
          </div>
        </div>

        <div className="hidden lg:flex min-h-[12rem] min-w-0 flex-[1_1_45%] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:min-h-0 lg:w-[400px] lg:flex-none lg:shrink-0">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="mt-4 h-24 w-full rounded-xl" />
          <div className="mt-6 space-y-4">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        </div>
      </div>
    </div>
  );
}
