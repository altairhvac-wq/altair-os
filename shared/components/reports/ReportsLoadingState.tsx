import {
  MasterContentStack,
  MasterPageCanvas,
  MasterPageHeader,
  MasterShellPage,
} from "@/shared/design-system/shell";

function Skeleton({ className }: { className?: string }) {
  return <div className={`admin-skeleton ${className ?? ""}`} />;
}

export function ReportsLoadingState() {
  return (
    <MasterShellPage density="compact">
      <MasterPageCanvas width="standard">
        <MasterContentStack density="compact">
          <MasterPageHeader
            title="Reports"
            subtitle="Track revenue, cash flow, sales performance, and operational health."
            density="compact"
            className="flex-col items-stretch gap-3 sm:flex-row sm:items-center"
            secondaryAction={
              <Skeleton className="h-9 w-full rounded-lg sm:w-44" />
            }
            primaryAction={
              <Skeleton className="h-9 w-full rounded-lg sm:w-44" />
            }
          />

          <Skeleton className="h-11 rounded-xl" />

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-32 rounded-2xl" />
            ))}
          </div>

          <div className="grid gap-3 lg:grid-cols-12 lg:gap-4">
            <Skeleton className="h-72 rounded-2xl lg:col-span-8" />
            <Skeleton className="h-44 rounded-2xl lg:col-span-4" />
            <Skeleton className="h-52 rounded-2xl lg:col-span-6" />
            <Skeleton className="h-52 rounded-2xl lg:col-span-6" />
          </div>

          <Skeleton className="h-48 rounded-2xl" />
          <Skeleton className="h-20 rounded-lg" />

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-40 rounded-2xl" />
            ))}
          </div>
        </MasterContentStack>
      </MasterPageCanvas>
    </MasterShellPage>
  );
}
