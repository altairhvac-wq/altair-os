/**
 * North Star page-surface gate.
 *
 * Admin shell chrome (sidebar + olive-graphite header) is always on via
 * AdminShell — this flag no longer rolls back navigation chrome.
 * It still gates page-level North Star canvases, loading states, and
 * detail/list surface variants.
 */
export const NORTH_STAR_SHELL_ENABLED =
  process.env.NEXT_PUBLIC_NORTH_STAR_SHELL === "true";

export function isNorthStarShellEnabled(): boolean {
  return NORTH_STAR_SHELL_ENABLED;
}
