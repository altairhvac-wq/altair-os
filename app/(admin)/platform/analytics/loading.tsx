import { pt } from "@/shared/components/platform-admin/north-star-m13/platform-north-star-styles";

/** Skeleton for Platform analytics while every source loads. */
export default function PlatformAnalyticsLoading() {
  return (
    <div className={`${pt.workspaceStack} pt-4`} aria-busy="true" aria-label="Loading analytics">
      <div className="h-10 w-full max-w-xl animate-pulse rounded-lg bg-[#EFE4CB]" />
      <div className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <div key={index} className={`${pt.metricCard} h-[5.5rem] animate-pulse`} />
        ))}
      </div>
      <div className={`${pt.sectionSurface} h-64 animate-pulse bg-[#FBF7EF]`} />
    </div>
  );
}
