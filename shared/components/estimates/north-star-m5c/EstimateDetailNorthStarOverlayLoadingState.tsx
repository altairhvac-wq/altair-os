import {
  MasterContentStack,
  MasterPageCanvas,
  masterDetailOverlayBodyInsetClass,
} from "@/shared/design-system/shell";
import { northStarDetailTokens as dt } from "@/shared/design-system/north-star/tokens";

function Skeleton({
  className,
  dark = false,
}: {
  className?: string;
  dark?: boolean;
}) {
  return (
    <div
      className={`north-star-skeleton ${dark ? "north-star-skeleton-dark" : ""} ${className ?? ""}`}
    />
  );
}

export function EstimateDetailNorthStarOverlayLoadingState() {
  return (
    <MasterPageCanvas
      width="detail"
      className={`${masterDetailOverlayBodyInsetClass} north-star-estimate-overlay-body`}
    >
      <MasterContentStack density="default">
        <div className={dt.commandPlate}>
          <Skeleton className="h-4 w-48 max-w-full" />
          <div className="flex flex-wrap gap-1.5">
            <Skeleton className="h-8 w-24 rounded-lg" />
            <Skeleton className="h-8 w-28 rounded-lg" />
          </div>
        </div>

        <div className={`hidden lg:grid ${dt.workspaceGrid}`}>
          <div className={dt.workspaceMain}>
            <Skeleton className="h-[28rem] w-full rounded-[1.25rem]" />
            <Skeleton className="h-36 w-full rounded-[1rem]" />
          </div>
          <div className={dt.workspaceSide}>
            {Array.from({ length: 2 }).map((_, index) => (
              <Skeleton key={index} className="h-28 w-full rounded-[1rem]" />
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-3 lg:hidden">
          {Array.from({ length: 2 }).map((_, index) => (
            <Skeleton key={index} className="h-28 w-full rounded-[1rem]" />
          ))}
          <Skeleton className="h-[24rem] w-full rounded-[1.25rem]" />
          <Skeleton className="h-32 w-full rounded-[1rem]" />
        </div>
      </MasterContentStack>
    </MasterPageCanvas>
  );
}
