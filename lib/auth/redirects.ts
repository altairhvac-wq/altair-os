import type { ActiveCompanyContext } from "@/lib/database/types";
import type { CompanyRole } from "@/lib/database/types/enums";
import { isAlphaComingSoonPath } from "@/lib/beta/alpha-hardening";
import {
  canAccessCompanySettings,
  canAccessSystemCheck,
} from "@/lib/database/access-control";

const AUTH_PATH_PREFIXES = ["/login", "/signup", "/auth"] as const;

const ALLOWED_NEXT_PATH_PREFIXES = [
  "/",
  "/dispatch",
  "/customers",
  "/jobs",
  "/estimates",
  "/price-book",
  "/invoices",
  "/expenses",
  "/time",
  "/network",
  "/reports",
  "/settings",
  "/settings/system-check",
  "/technician",
  "/tech/time",
  "/tech/receipts",
  "/tech/notifications",
  "/setup",
] as const;

function isAuthPath(path: string): boolean {
  return AUTH_PATH_PREFIXES.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`),
  );
}

function isAllowedAppPath(path: string): boolean {
  return ALLOWED_NEXT_PATH_PREFIXES.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`),
  );
}

/**
 * Validates a post-login redirect target. Rejects external URLs, auth routes,
 * and unknown paths to prevent open redirects and redirect loops.
 */
export function sanitizeNextPath(
  next: string | null | undefined,
): string | null {
  if (!next) {
    return null;
  }

  const path = next.trim();

  if (!path.startsWith("/") || path.startsWith("//")) {
    return null;
  }

  if (path.includes("://") || path.includes("\\")) {
    return null;
  }

  if (isAuthPath(path)) {
    return null;
  }

  if (!isAllowedAppPath(path)) {
    return null;
  }

  return path;
}

const ADMIN_DASHBOARD_ROLES: readonly CompanyRole[] = [
  "owner",
  "admin",
  "dispatcher",
  "office_staff",
];

export function shouldUseTechnicianHome(context: ActiveCompanyContext): boolean {
  if ((ADMIN_DASHBOARD_ROLES as readonly string[]).includes(context.role)) {
    return false;
  }

  if (context.role === "technician") {
    return true;
  }

  const { permissions } = context;

  return (
    permissions.viewAssignedJobs &&
    !permissions.dispatchJobs &&
    !permissions.manageBilling &&
    !permissions.manageCompany &&
    !permissions.manageCustomers &&
    !permissions.manageUsers
  );
}

export function getDefaultPostLoginPath(
  context: ActiveCompanyContext,
): string {
  return shouldUseTechnicianHome(context) ? "/technician" : "/";
}

export function resolvePostLoginRedirect(
  context: ActiveCompanyContext,
  next: string | null | undefined,
): string {
  const safeNext = sanitizeNextPath(next);

  if (safeNext) {
    if (shouldUseTechnicianHome(context) && !safeNext.startsWith("/technician") && !safeNext.startsWith("/tech/")) {
      return getDefaultPostLoginPath(context);
    }

    if (isAlphaComingSoonPath(safeNext)) {
      return getDefaultPostLoginPath(context);
    }

    if (
      safeNext === "/settings" ||
      safeNext.startsWith("/settings/")
    ) {
      if (!canAccessCompanySettings(context)) {
        return getDefaultPostLoginPath(context);
      }

      if (
        safeNext === "/settings/system-check" ||
        safeNext.startsWith("/settings/system-check/")
      ) {
        if (!canAccessSystemCheck(context)) {
          return "/settings";
        }
      }
    }

    return safeNext;
  }

  return getDefaultPostLoginPath(context);
}
