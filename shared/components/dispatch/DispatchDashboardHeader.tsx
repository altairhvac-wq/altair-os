import { dispatchMissionClasses as dm } from "./dispatch-board-presentation";

export function DispatchDashboardHeader() {
  return (
    <header className="hidden shrink-0 md:block">
      <div className="flex min-w-0 flex-col gap-0.5 sm:flex-row sm:items-baseline sm:gap-2">
        <h1 className={dm.headerTitle}>Dispatch</h1>
        <p className={dm.headerSubtitle}>
          Operations board — assign technicians and run today&apos;s schedule.
        </p>
      </div>
    </header>
  );
}
