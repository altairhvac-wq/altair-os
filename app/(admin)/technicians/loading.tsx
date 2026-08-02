import {
  altairMcGridGapClass,
  altairMcListClass,
  altairMcTileClass,
} from "@/shared/design-system/components";
import { MasterPageHeader } from "@/shared/design-system/shell";

export default function TechniciansLoading() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading technicians">
      <MasterPageHeader
        title="Technicians"
        subtitle="Field roster, live time-clock status, and share codes"
        density="compact"
        surfaceVariant="northStar"
      />

      <div className={`grid grid-cols-2 ${altairMcGridGapClass} lg:grid-cols-4`}>
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className={`${altairMcTileClass} min-h-[88px]`}>
            <div className="h-2.5 w-16 animate-pulse rounded bg-altair-border" />
            <div className="mt-3 h-8 w-10 animate-pulse rounded bg-altair-border" />
          </div>
        ))}
      </div>

      <div className={`${altairMcListClass} min-h-[240px]`}>
        <div className="space-y-0 divide-y divide-altair-border">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="flex items-center gap-3 px-3.5 py-3">
              <div className="h-9 w-9 animate-pulse rounded-full bg-altair-border" />
              <div className="h-3 w-40 animate-pulse rounded bg-altair-border" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
