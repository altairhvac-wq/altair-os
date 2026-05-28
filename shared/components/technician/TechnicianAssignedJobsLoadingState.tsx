function Skeleton({ className }: { className?: string }) {
  return <div className={`admin-skeleton ${className ?? ""}`} />;
}

function SectionLabelSkeleton() {
  return <Skeleton className="h-3 w-24" />;
}

export function TechnicianAssignedJobsLoadingState() {
  return (
    <div className="space-y-4 pb-[max(0.5rem,env(safe-area-inset-bottom,0px))]">
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

      <div className="space-y-6">
        <div className="space-y-3 rounded-2xl border-2 border-slate-200/80 bg-white p-3 sm:p-4">
          <SectionLabelSkeleton />
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-3 w-32" />
              </div>
              <Skeleton className="h-11 w-11 rounded-lg" />
            </div>
            <Skeleton className="mt-4 h-11 w-full rounded-xl" />
          </div>
        </div>

        <div className="space-y-3">
          <SectionLabelSkeleton />
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-5 w-36" />
              </div>
              <Skeleton className="h-11 w-11 rounded-lg" />
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-2 border-t border-slate-200/80 pt-4">
        <SectionLabelSkeleton />
        <Skeleton className="h-11 w-full rounded-lg" />
      </div>
    </div>
  );
}
