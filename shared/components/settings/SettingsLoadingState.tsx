function Skeleton({
  className,
  northStar,
}: {
  className: string;
  northStar: boolean;
}) {
  return (
    <div
      className={`${className} animate-pulse rounded ${
        northStar ? "bg-[rgba(138,99,36,0.12)]" : "bg-altair-paper-subtle"
      }`}
    />
  );
}

export function SettingsLoadingState({
  northStar = false,
}: {
  northStar?: boolean;
}) {
  return (
    <div aria-label="Loading Settings" aria-busy="true" className="min-w-0">
      <div
        className={`border-b pb-4 ${
          northStar
            ? "border-[rgba(138,99,36,0.16)]"
            : "border-altair-border"
        }`}
      >
        <Skeleton className="h-7 w-40" northStar={northStar} />
        <Skeleton className="mt-2 h-4 w-full max-w-md" northStar={northStar} />
      </div>
      <div className="mt-6 space-y-6">
        <div>
          <Skeleton className="h-5 w-32" northStar={northStar} />
          <Skeleton className="mt-2 h-4 w-64 max-w-full" northStar={northStar} />
        </div>
        <div
          className={`divide-y border-y ${
            northStar
              ? "divide-[rgba(138,99,36,0.12)] border-[rgba(138,99,36,0.16)]"
              : "divide-altair-border border-altair-border"
          }`}
        >
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="flex items-center gap-4 py-4">
              <Skeleton className="h-9 w-9 shrink-0" northStar={northStar} />
              <div className="min-w-0 flex-1">
                <Skeleton className="h-4 w-40 max-w-full" northStar={northStar} />
                <Skeleton
                  className="mt-2 h-3 w-72 max-w-full"
                  northStar={northStar}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
