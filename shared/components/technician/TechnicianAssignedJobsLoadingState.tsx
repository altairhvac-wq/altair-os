function Skeleton({ className }: { className?: string }) {
  return <div className={`admin-skeleton ${className ?? ""}`} />;
}

function SectionLabelSkeleton() {
  return <Skeleton className="h-3 w-20" />;
}

function HeroCardSkeleton() {
  return (
    <div className="-mx-4 overflow-hidden bg-white shadow-[0_12px_40px_-12px_rgb(8_145_178_/_0.2)] sm:-mx-5 sm:rounded-3xl">
      <div className="space-y-4 px-5 pb-2 pt-5">
        <div className="space-y-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-16" />
        </div>
        <Skeleton className="h-6 w-20 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-full max-w-[18rem]" />
          <Skeleton className="h-3 w-28" />
        </div>
      </div>
      <div className="space-y-2.5 px-5 pb-5 pt-2">
        <Skeleton className="h-[3.75rem] w-full rounded-2xl" />
        <Skeleton className="h-11 w-full rounded-xl" />
      </div>
    </div>
  );
}

function UpNextRowSkeleton() {
  return (
    <div className="flex items-center gap-3 py-3">
      <div className="min-w-0 flex-1 space-y-1.5">
        <Skeleton className="h-4 w-36" />
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-3 w-28" />
      </div>
      <Skeleton className="h-4 w-4 shrink-0" />
    </div>
  );
}

export function TechnicianAssignedJobsLoadingState() {
  return (
    <div className="space-y-3 pb-[max(0.5rem,env(safe-area-inset-bottom,0px))]">
      <div className="space-y-1.5">
        <div className="flex min-h-6 items-center gap-1.5 px-0.5">
          <Skeleton className="h-3 w-12" />
          <Skeleton className="h-3 w-16" />
          <Skeleton className="ml-auto h-3 w-24" />
        </div>
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: 7 }).map((_, index) => (
            <Skeleton
              key={index}
              className="mx-auto h-10 w-full max-w-[2.75rem] rounded-xl"
            />
          ))}
        </div>
      </div>

      <Skeleton className="h-14 rounded-2xl" />

      <div className="space-y-5">
        <HeroCardSkeleton />
      </div>

      <div className="space-y-1 px-0.5">
        <SectionLabelSkeleton />
        <div className="divide-y divide-slate-100/90">
          <UpNextRowSkeleton />
          <UpNextRowSkeleton />
        </div>
      </div>

      <div className="space-y-2 border-t border-slate-200/60 pt-4">
        <SectionLabelSkeleton />
        <Skeleton className="h-11 w-full rounded-xl" />
      </div>
    </div>
  );
}
