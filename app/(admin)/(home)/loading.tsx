import { isNorthStarShellEnabled } from "@/lib/beta/north-star-shell";
import { AdminMobileHomeLoadingState } from "@/shared/components/dashboard/AdminMobileHomeLoadingState";
import { DashboardNorthStarLoadingState } from "@/shared/components/dashboard/north-star-m2";
import { OperationalDashboardLoadingState } from "@/shared/components/dashboard/OperationalDashboardLoadingState";

/**
 * ============================== THE FIRST FRAME MUST BE THE RIGHT SHAPE ==============================
 * OperationalDashboardView renders two trees and lets CSS pick: AdminMobileHome
 * under `md:hidden`, Mission Control under `hidden md:contents`. This boundary
 * did not do the same. It rendered the desktop skeleton at every width --
 * neither OperationalDashboardLoadingState nor DashboardNorthStarLoadingState
 * contains a single `md:` class -- so on a phone the first frame was a
 * light desktop Mission Control skeleton, held for as long as the dashboard
 * took to load, and then replaced by a dark launcher with a different
 * structure.
 *
 * The breakpoint wrappers below are the SAME ones the view uses, in the same
 * order, so whichever branch CSS selects for the skeleton is the branch it will
 * select for the page. Nothing is timed, and nothing is deferred: the swap
 * happens when the data arrives, and the shape does not change when it does.
 */
export default function DashboardLoading() {
  const desktop = isNorthStarShellEnabled() ? (
    <DashboardNorthStarLoadingState />
  ) : (
    <OperationalDashboardLoadingState />
  );

  return (
    <>
      <div className="md:hidden">
        <AdminMobileHomeLoadingState />
      </div>
      <div className="hidden md:contents">{desktop}</div>
    </>
  );
}
