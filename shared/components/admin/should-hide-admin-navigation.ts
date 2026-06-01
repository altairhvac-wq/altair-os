import { shouldUseTechnicianHome } from "@/lib/auth/redirects";
import type { ActiveCompanyContext } from "@/lib/database/types";
import {
  isOwnerViewModeEligible,
  isTechnicianAppRoute,
  type OwnerViewMode,
} from "@/shared/lib/owner-view-mode";

export function shouldHideAdminNavigation(
  pathname: string,
  companyContext: ActiveCompanyContext,
  viewMode: OwnerViewMode,
): boolean {
  if (isTechnicianAppRoute(pathname)) {
    return true;
  }

  if (shouldUseTechnicianHome(companyContext)) {
    return true;
  }

  if (isOwnerViewModeEligible(companyContext.role) && viewMode === "technician") {
    return true;
  }

  return false;
}
