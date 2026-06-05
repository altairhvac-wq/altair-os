function Skeleton({ className }: { className?: string }) {
  return <div className={`admin-skeleton ${className ?? ""}`} />;
}

function SectionLabelSkeleton() {
  return <Skeleton className="h-3 w-20" />;
}

function HeroCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border-l-[4px] border-l-slate-200 bg-white p-4 shadow-[0_2px_16px_-4px_rgb(15_23_42_/_0.1)]">
      <div className="space-y-3">
        <div className="space-y-2">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-3 w-16" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-6 w-20 rounded-full" />
          <Skeleton className="h-6 w-14 rounded-full" />
        </div>
        <div className="space-y-1.5">
          <Skeleton className="h-3 w-full max-w-[16rem]" />
          <Skeleton className="h-3 w-32" />
        </div>
      </div>
      <div className="mt-4 border-t border-slate-100 pt-3">
        <Skeleton className="h-12 w-full rounded-xl" />
      </div>
    </div>
  );
}

function UpNextCardSkeleton() {
  return (
    <div className="w-[14.5rem] shrink-0 rounded-2xl bg-white p-3.5 shadow-[0_1px_8px_-2px_rgb(15_23_42_/_0.08)]">
      <div className="space-y-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-3 w-full max-w-[10rem]" />
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
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

      <div className="space-y-2.5">
        <SectionLabelSkeleton />
        <HeroCardSkeleton />
      </div>

      <div className="space-y-2.5">
        <div className="flex items-center justify-between px-0.5">
          <SectionLabelSkeleton />
          <Skeleton className="h-5 w-6 rounded-full" />
        </div>
        <div className="flex gap-2.5 overflow-x-hidden">
          <UpNextCardSkeleton />
          <UpNextCardSkeleton />
        </div>
      </div>

      <div className="space-y-2 border-t border-slate-200/60 pt-4">
        <SectionLabelSkeleton />
        <Skeleton className="h-11 w-full rounded-xl" />
      </div>
    </div>
  );
}
