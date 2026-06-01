function Skeleton({ className }: { className?: string }) {
  return <div className={`admin-skeleton ${className ?? ""}`} />;
}

/** Route-neutral main content skeleton for admin shell transitions. */
export function AdminShellContentLoadingState() {
  return (
    <div
      className="space-y-3"
      aria-busy="true"
      aria-label="Loading page"
    >
      <div className="space-y-2">
        <Skeleton className="h-7 w-40 rounded-lg sm:h-8 sm:w-48" />
        <Skeleton className="h-4 w-56 max-w-full sm:w-72" />
      </div>

      <div className="admin-card space-y-3 p-4">
        <Skeleton className="h-9 w-full max-w-md rounded-lg" />
        {Array.from({ length: 5 }).map((_, index) => (
          <Skeleton key={index} className="h-10 w-full rounded-lg" />
        ))}
      </div>
    </div>
  );
}
