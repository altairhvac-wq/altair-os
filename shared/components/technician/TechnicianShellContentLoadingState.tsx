function Skeleton({ className }: { className?: string }) {
  return <div className={`admin-skeleton ${className ?? ""}`} />;
}

/** Route-neutral content skeleton for technician shell transitions. */
export function TechnicianShellContentLoadingState() {
  return (
    <div
      className="space-y-3"
      aria-busy="true"
      aria-label="Loading page"
    >
      <Skeleton className="h-16 rounded-xl" />
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, index) => (
          <Skeleton key={index} className="h-28 rounded-xl" />
        ))}
      </div>
    </div>
  );
}
