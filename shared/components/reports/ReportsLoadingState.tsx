function Skeleton({ className }: { className?: string }) {
  return <div className={`admin-skeleton ${className ?? ""}`} />;
}

export function ReportsLoadingState() {
  return (
    <div className="flex flex-col gap-5 pb-2 sm:gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-4 w-80 max-w-full" />
        </div>
        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
          <Skeleton className="h-10 w-full rounded-lg sm:w-44" />
          <Skeleton className="h-10 w-full rounded-lg sm:w-44" />
        </div>
      </div>

      <Skeleton className="h-12 rounded-xl" />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-28 rounded-2xl" />
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-12 lg:gap-5">
        <Skeleton className="h-96 rounded-2xl lg:col-span-8" />
        <Skeleton className="h-96 rounded-2xl lg:col-span-4" />
        <Skeleton className="h-72 rounded-2xl lg:col-span-6" />
        <Skeleton className="h-72 rounded-2xl lg:col-span-6" />
      </div>

      <Skeleton className="h-56 rounded-2xl" />
      <Skeleton className="h-36 rounded-2xl" />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-52 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
