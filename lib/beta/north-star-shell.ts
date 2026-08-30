/**
 * North Star page-surface gate.
 *
 * Admin shell chrome (sidebar + olive-graphite header) is always on via
 * AdminShell — this flag no longer rolls back navigation chrome.
 * It still gates page-level North Star canvases, loading states, and
 * detail/list surface variants.
 *
 * PRESTIGE: this is now **on by default**, and only an explicit
 * `NEXT_PUBLIC_NORTH_STAR_SHELL=false` turns it off.
 *
 * It used to be off unless a deployment opted in, and the only place it was
 * ever set was one developer's `.env.local` — it is commented out in
 * `.env.example` and absent from the deploy config. That meant every fresh
 * environment, preview build and CI run rendered a different product from the
 * one being designed and reviewed, which is the single worst property a visual
 * flag can have.
 *
 * Flipping the default is safe because the two branches have converged: the
 * Prestige palette is applied by redefining Tailwind's `--color-*` theme
 * variables, so both branches paint from the same ramp. Captured side by side
 * at 1440 on the dashboard and the customers list, the legacy branch is
 * visually near-identical — the fork is now code duplication rather than two
 * designs (see ALTAIR-PRESTIGE.md D-3 and D-22).
 *
 * The opt-out stays until the ~736 branch points are collapsed, so a
 * regression can still be bisected against the old path.
 */
export const NORTH_STAR_SHELL_ENABLED =
  process.env.NEXT_PUBLIC_NORTH_STAR_SHELL !== "false";

export function isNorthStarShellEnabled(): boolean {
  return NORTH_STAR_SHELL_ENABLED;
}
