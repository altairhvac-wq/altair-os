import { dispatchMissionClasses as dm } from "@/shared/components/dispatch/dispatch-board-presentation";
import {
  MasterContentStack,
  MasterPageCanvas,
  MasterShellPage,
} from "@/shared/design-system/shell";
import { altairReportTileClass } from "@/shared/design-system/components/report-surface";

export default function ScheduleLoading() {
  return (
    <MasterShellPage density="compact">
      <MasterPageCanvas width="wide">
        <div className={`${dm.pageCanvas} p-2 sm:p-3`}>
          <MasterContentStack density="compact">
            <div className={dm.boardSurface}>
              <div className={dm.boardHeader}>
                <div className="min-w-0">
                  <div className="h-4 w-24 animate-pulse rounded bg-white/10" />
                  <div className="mt-2 hidden h-3 w-56 animate-pulse rounded bg-white/5 sm:block" />
                </div>
                <div className="h-9 w-40 animate-pulse rounded-lg bg-white/5" />
              </div>
              <div className={`${dm.boardBody}`}>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-7">
                  {Array.from({ length: 7 }).map((_, index) => (
                    <div
                      key={index}
                      className={`${altairReportTileClass} min-h-[9.5rem] animate-pulse px-3 py-2.5`}
                    >
                      <div className="h-3 w-10 rounded bg-white/10" />
                      <div className="mt-2 h-6 w-8 rounded bg-white/10" />
                      <div className="mt-4 space-y-2">
                        <div className="h-2.5 w-full rounded bg-white/5" />
                        <div className="h-2.5 w-3/4 rounded bg-white/5" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </MasterContentStack>
        </div>
      </MasterPageCanvas>
    </MasterShellPage>
  );
}
