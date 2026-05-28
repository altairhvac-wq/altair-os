function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={`admin-skeleton ${className ?? ""}`}
    />
  );
}

export function JobsLoadingState() {
  return (
    <div className="flex flex-col gap-4 lg:h-[calc(100dvh-7rem)] lg:flex-row lg:overflow-hidden">
      <div className="flex min-h-[16rem] min-w-0 flex-[1_1_55%] flex-col lg:overflow-hidden admin-card lg:min-h-0 lg:flex-1">
        <div className="admin-panel-header p-4 sm:px-5">
          <div className="flex items-center justify-between gap-4">
            <Skeleton className="h-10 w-64" />
            <Skeleton className="h-10 w-32" />
          </div>
          <div className="mt-3 flex flex-wrap gap-3">
            <Skeleton className="h-9 w-full max-w-md" />
            <Skeleton className="h-9 w-36" />
            <Skeleton className="h-9 w-36" />
          </div>
        </div>

        <div className="min-h-0 flex-1 lg:overflow-y-auto p-4">
          <div className="space-y-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-2 py-3">
                <Skeleton className="h-4 w-20" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-36" />
                  <Skeleton className="h-3 w-48" />
                </div>
                <Skeleton className="h-6 w-20 rounded-full" />
                <Skeleton className="h-6 w-16 rounded-full" />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="admin-card hidden min-h-[12rem] min-w-0 flex-[1_1_45%] flex-col overflow-hidden p-6 lg:flex lg:min-h-0 lg:w-[400px] lg:flex-none lg:shrink-0">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="mt-2 h-4 w-56" />
        <div className="mt-8 space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      </div>
    </div>
  );
}
