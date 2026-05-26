/**
 * Week 1 alpha deployment hardening flags.
 * Enabled in production (Vercel) or when NEXT_PUBLIC_ALPHA_HARDENING=true.
 */

export function isAlphaHardeningEnabled(): boolean {
  return (
    process.env.NODE_ENV === "production" ||
    process.env.NEXT_PUBLIC_ALPHA_HARDENING === "true"
  );
}

/** Admin nav items hidden during internal alpha (routes remain reachable for dev). */
export const ALPHA_HIDDEN_ADMIN_NAV_HREFS = ["/network"] as const;

/** Billing-adjacent pages shown as Coming Soon during alpha. */
export const ALPHA_COMING_SOON_PATH_PREFIXES = [
  "/estimates",
  "/price-book",
] as const;

export const ALPHA_COMING_SOON_NAV_HREFS = [
  "/estimates",
  "/price-book",
] as const;

export function isAlphaComingSoonPath(pathname: string): boolean {
  return ALPHA_COMING_SOON_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export function shouldShowAlphaComingSoon(pathname: string): boolean {
  return isAlphaHardeningEnabled() && isAlphaComingSoonPath(pathname);
}

export function isAlphaHiddenAdminNavHref(href: string): boolean {
  if (!isAlphaHardeningEnabled()) {
    return false;
  }

  return (
    (ALPHA_HIDDEN_ADMIN_NAV_HREFS as readonly string[]).includes(href) ||
    (ALPHA_COMING_SOON_NAV_HREFS as readonly string[]).includes(href)
  );
}
