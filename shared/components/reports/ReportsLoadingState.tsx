function Skeleton({ className }: { className?: string }) {
  return <div className={`admin-skeleton ${className ?? ""}`} />;
}

export function ReportsLoadingState() {
  return (
    <div className="flex flex-col gap-4 pb-2 sm:gap-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-7 w-32" />
          <Skeleton className="h-3.5 w-80 max-w-full" />
        </div>
        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
          <Skeleton className="h-9 w-full rounded-lg sm:w-44" />
          <Skeleton className="h-9 w-full rounded-lg sm:w-44" />
        </div>
      </div>

      <Skeleton className="h-11 rounded-xl" />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-32 rounded-2xl" />
        ))}
      </div>

      <div className="grid gap-3 lg:grid-cols-12 lg:gap-4">
        <Skeleton className="h-72 rounded-2xl lg:col-span-8" />
        <Skeleton className="h-44 rounded-2xl lg:col-span-4" />
        <Skeleton className="h-52 rounded-2xl lg:col-span-6" />
        <Skeleton className="h-52 rounded-2xl lg:col-span-6" />
      </div>

      <Skeleton className="h-48 rounded-2xl" />
      <Skeleton className="h-20 rounded-lg" />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-40 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
