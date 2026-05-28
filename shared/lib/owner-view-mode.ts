import type { ActiveCompanyContext } from "@/lib/database/types";
import type { CompanyRole } from "@/lib/database/types/enums";
import {
  COMPANY_ROLE_PERMISSIONS,
  hasCompanyPermission,
  hasCompanyRole,
  type CompanyPermission,
} from "@/lib/database/types/roles";

export type OwnerViewMode = "owner_admin" | "technician" | "dispatch";

export const OWNER_VIEW_MODE_LABELS: Record<OwnerViewMode, string> = {
  owner_admin: "Owner / Admin",
  technician: "Technician",
  dispatch: "Dispatch",
};

export const OWNER_VIEW_MODE_DESCRIPTIONS: Record<OwnerViewMode, string> = {
  owner_admin: "Full workspace navigation",
  technician: "Mobile field workflow",
  dispatch: "Scheduling and job assignment focus",
};

export const OWNER_VIEW_MODE_LANDING: Record<OwnerViewMode, string> = {
  owner_admin: "/",
  technician: "/technician",
  dispatch: "/dispatch",
};

const PREVIEW_ROLE_BY_VIEW_MODE: Record<
  Exclude<OwnerViewMode, "owner_admin">,
  CompanyRole
> = {
  technician: "technician",
  dispatch: "dispatcher",
};

function buildPermissionsForRole(role: CompanyRole) {
  return (Object.keys(COMPANY_ROLE_PERMISSIONS) as CompanyPermission[]).reduce(
    (acc, permission) => {
      acc[permission] = hasCompanyPermission(role, permission);
      return acc;
    },
    {} as ActiveCompanyContext["permissions"],
  );
}

const PREVIEW_PERMISSIONS_BY_ROLE = new Map<
  CompanyRole,
  ActiveCompanyContext["permissions"]
>();

function getPermissionsForPreviewRole(role: CompanyRole) {
  const cached = PREVIEW_PERMISSIONS_BY_ROLE.get(role);
  if (cached) {
    return cached;
  }

  const permissions = buildPermissionsForRole(role);
  PREVIEW_PERMISSIONS_BY_ROLE.set(role, permissions);
  return permissions;
}

export function isOwnerViewModeEligible(
  role: CompanyRole | string | null | undefined,
): boolean {
  return hasCompanyRole(role, ["owner"]);
}

export function getNavigationContextForOwnerViewMode(
  context: ActiveCompanyContext,
  viewMode: OwnerViewMode,
): ActiveCompanyContext {
  if (!isOwnerViewModeEligible(context.role) || viewMode === "owner_admin") {
    return context;
  }

  const previewRole = PREVIEW_ROLE_BY_VIEW_MODE[viewMode];

  return {
    ...context,
    permissions: getPermissionsForPreviewRole(previewRole),
  };
}

export function isTechnicianAppRoute(pathname: string): boolean {
  return pathname === "/technician" || pathname.startsWith("/tech/");
}

export function shouldRedirectForOwnerViewMode(
  pathname: string,
  viewMode: OwnerViewMode,
): string | null {
  if (viewMode === "technician") {
    if (pathname === "/") {
      return OWNER_VIEW_MODE_LANDING.technician;
    }

    return null;
  }

  if (isTechnicianAppRoute(pathname)) {
    return OWNER_VIEW_MODE_LANDING[viewMode];
  }

  if (viewMode === "dispatch" && pathname === "/") {
    return OWNER_VIEW_MODE_LANDING.dispatch;
  }

  return null;
}
