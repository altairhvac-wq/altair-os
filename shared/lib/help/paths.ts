/**
 * Where the how-to library lives on the public site. Import-free on purpose:
 * the request boundary (lib/supabase/middleware.ts) and the site menu read it.
 */

/** The public index of how-to notes. */
export const HOW_TO_PATH = "/how-to";

/** One note's public page. */
export function howToNotePath(slug: string): string {
  return `${HOW_TO_PATH}/${slug}`;
}

/** The signed-in Help page, and one note inside it. */
export const HELP_PATH = "/help";

export function helpNotePath(slug: string): string {
  return `${HELP_PATH}/${slug}`;
}

/** True for the public index and every note page under it. */
export function isHowToPath(pathname: string): boolean {
  return pathname === HOW_TO_PATH || pathname.startsWith(`${HOW_TO_PATH}/`);
}
