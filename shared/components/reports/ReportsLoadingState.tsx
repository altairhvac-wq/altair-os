function Skeleton({ className }: { className?: string }) {
  return <div className={`admin-skeleton ${className ?? ""}`} />;
}

export function ReportsLoadingState() {
  return (
    <div className="flex flex-col gap-6 pb-2">
      <Skeleton className="h-16 rounded-xl" />

      {Array.from({ length: 4 }).map((_, sectionIndex) => (
        <div
          key={sectionIndex}
          className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
        >
          <Skeleton className="h-5 w-40" />
          <Skeleton className="mt-2 h-4 w-64" />
          <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: sectionIndex === 0 ? 4 : 3 }).map(
              (_, cardIndex) => (
                <Skeleton key={cardIndex} className="h-28 rounded-2xl" />
              ),
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
