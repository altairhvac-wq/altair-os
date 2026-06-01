function Skeleton({ className }: { className?: string }) {
  return <div className={`admin-skeleton ${className ?? ""}`} />;
}

function SectionLabelSkeleton() {
  return <Skeleton className="h-3 w-24" />;
}

function DispatchCardSkeleton() {
  return (
    <div className="w-full rounded-xl border border-slate-200/90 bg-white p-3.5 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-3 w-28" />
        </div>
        <Skeleton className="h-5 w-12 rounded-full" />
      </div>
      <div className="mt-3 space-y-1.5">
        <Skeleton className="h-3 w-full max-w-[14rem]" />
        <Skeleton className="h-3 w-full max-w-[10rem]" />
      </div>
      <div className="mt-3 border-t border-slate-100 pt-2.5">
        <Skeleton className="h-5 w-20 rounded-full" />
      </div>
    </div>
  );
}

export function TechnicianAssignedJobsLoadingState() {
  return (
    <div className="space-y-4 pb-[max(0.5rem,env(safe-area-inset-bottom,0px))]">
      <div className="rounded-lg border border-slate-200/80 bg-white px-1 py-2 shadow-sm">
        <div className="grid grid-cols-7 gap-0.5">
          {Array.from({ length: 7 }).map((_, index) => (
            <Skeleton key={index} className="mx-auto h-14 w-full max-w-[2.75rem] rounded-md" />
          ))}
        </div>
      </div>

      <Skeleton className="h-16 rounded-xl" />

      <div className="rounded-xl bg-white px-3 py-2.5 shadow-sm ring-1 ring-slate-200 sm:px-4 sm:py-3">
        <div className="flex min-h-11 items-center justify-between gap-3">
          <div className="space-y-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-4 w-28" />
          </div>
          <Skeleton className="h-3 w-28" />
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
        <DispatchCardSkeleton />
        <DispatchCardSkeleton />
      </div>

      <div className="space-y-2 border-t border-slate-200/80 pt-4">
        <SectionLabelSkeleton />
        <Skeleton className="h-11 w-full rounded-lg" />
      </div>
    </div>
  );
}
