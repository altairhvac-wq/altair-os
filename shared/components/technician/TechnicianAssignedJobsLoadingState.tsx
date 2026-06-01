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
    <div className="space-y-2 pb-[max(0.5rem,env(safe-area-inset-bottom,0px))]">
      <div className="space-y-1">
        <div className="flex min-h-6 items-center gap-1.5 px-0.5">
          <Skeleton className="h-3 w-12" />
          <Skeleton className="h-3 w-16" />
          <Skeleton className="ml-auto h-3 w-24" />
        </div>
        <div className="grid grid-cols-7 gap-0.5">
          {Array.from({ length: 7 }).map((_, index) => (
            <Skeleton key={index} className="mx-auto h-10 w-full max-w-[2.75rem] rounded-md" />
          ))}
        </div>
      </div>

      <Skeleton className="h-16 rounded-xl" />

      <div className="overflow-hidden rounded-xl ring-1 ring-slate-200/60">
        <div className="border-b border-slate-200/80 bg-white px-2.5 py-2">
          <Skeleton className="h-4 w-20" />
        </div>
        <div className="flex gap-1.5 overflow-x-hidden bg-white p-1.5 sm:hidden">
          <DispatchCardSkeleton />
          <div className="w-[11.5rem] shrink-0">
            <DispatchCardSkeleton />
          </div>
        </div>
        <div className="hidden gap-2 bg-white p-2 sm:grid sm:grid-cols-2 lg:grid-cols-1">
          <DispatchCardSkeleton />
          <DispatchCardSkeleton />
        </div>
      </div>

      <div className="space-y-2 border-t border-slate-200/80 pt-4">
        <SectionLabelSkeleton />
        <Skeleton className="h-11 w-full rounded-lg" />
      </div>
    </div>
  );
}
